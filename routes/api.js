'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 1. SCHEMAS
const ReplySchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false }
});

const ThreadSchema = new Schema({
  board: { type: String, required: true },
  text: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  delete_password: { type: String, required: true },
  replies: [ReplySchema]
});

const Thread = mongoose.model('Thread', ThreadSchema);

// 2. ROUTING LOGIC
module.exports = function (app) {
  
  // --- THREADS ---
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;
      const newThread = new Thread({
        board,
        text,
        delete_password,
        replies: []
      });
      try {
        await newThread.save();
        res.redirect(`/b/${board}/`);
      } catch (err) { res.send('error') }
    })
    
    .get(async (req, res) => {
      const board = req.params.board;
      try {
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .lean();

        threads.forEach(thread => {
          thread.replycount = thread.replies.length;
          // Hide sensitive info
          delete thread.delete_password;
          delete thread.reported;
          // Only show 3 most recent replies
          thread.replies = thread.replies
            .sort((a, b) => b.created_on - a.created_on)
            .slice(0, 3)
            .map(reply => {
              delete reply.delete_password;
              delete reply.reported;
              return reply;
            });
        });
        res.json(threads);
      } catch (err) { res.send('error') }
    })
    
    .put(async (req, res) => {
      const { thread_id } = req.body;
      await Thread.findByIdAndUpdate(thread_id, { reported: true });
      res.send('reported');
    })
    
    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      const thread = await Thread.findById(thread_id);
      if (!thread) return res.send('thread not found');
      if (thread.delete_password === delete_password) {
        await Thread.findByIdAndDelete(thread_id);
        res.send('success');
      } else {
        res.send('incorrect password');
      }
    });

  // --- REPLIES ---
  app.route('/api/replies/:board')
    .post(async (req, res) => {
      const { text, delete_password, thread_id } = req.body;
      const board = req.params.board;
      const reply = { text, delete_password, created_on: new Date(), reported: false };
      
      try {
        await Thread.findByIdAndUpdate(thread_id, {
          $set: { bumped_on: new Date() },
          $push: { replies: reply }
        });
        res.redirect(`/b/${board}/${thread_id}`);
      } catch (err) { res.send('error') }
    })
    
    .get(async (req, res) => {
      const { thread_id } = req.query; // Detail view uses query string ?thread_id=...
      try {
        const thread = await Thread.findById(thread_id).lean();
        if (!thread) return res.json({ error: 'no thread found' });
        
        // Hide sensitive info but show ALL replies
        delete thread.delete_password;
        delete thread.reported;
        thread.replies.forEach(reply => {
          delete reply.delete_password;
          delete reply.reported;
        });
        res.json(thread);
      } catch (err) { res.send('error') }
    })
    
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      await Thread.findOneAndUpdate(
        { _id: thread_id, "replies._id": reply_id },
        { $set: { "replies.$.reported": true } }
      );
      res.send('reported');
    })
    
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      const thread = await Thread.findById(thread_id);
      const reply = thread.replies.id(reply_id);
      
      if (reply.delete_password === delete_password) {
        reply.text = '[deleted]';
        await thread.save();
        res.send('success');
      } else {
        res.send('incorrect password');
      }
    });
};