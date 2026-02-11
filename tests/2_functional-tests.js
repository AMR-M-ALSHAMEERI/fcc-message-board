const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  let testThreadId;
  let testReplyId;

  suite('API routing for /api/threads/:board', function() {
    
    test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
  chai.request(server)
    .post('/api/threads/testBoard')
    .send({ text: 'Test Thread', delete_password: 'password' })
    .redirects(0) // <--- ADD THIS: Tell Chai NOT to follow the redirect
    .end(function(err, res) {
      assert.equal(res.status, 302); // 302 is the code for "Redirect"
      done();
    });
});

    test('Viewing the 10 most recent threads: GET request to /api/threads/{board}', function(done) {
      chai.request(server)
        .get('/api/threads/testBoard')
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.property(res.body[0], '_id');
          testThreadId = res.body[0]._id; // Save ID for next tests
          done();
        });
    });

    test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
      chai.request(server)
        .put('/api/threads/testBoard')
        .send({ thread_id: testThreadId })
        .end(function(err, res) {
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('Deleting a thread with incorrect password: DELETE request to /api/threads/{board}', function(done) {
      chai.request(server)
        .delete('/api/threads/testBoard')
        .send({ thread_id: testThreadId, delete_password: 'wrong' })
        .end(function(err, res) {
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });
  });

  suite('API routing for /api/replies/:board', function() {

    test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
  chai.request(server)
    .post('/api/replies/testBoard')
    .send({ thread_id: testThreadId, text: 'Test Reply', delete_password: 'password' })
    .redirects(0) // <--- ADD THIS: Tell Chai NOT to follow the redirect
    .end(function(err, res) {
      assert.equal(res.status, 302); // 302 is the code for "Redirect"
      done();
    });
});

    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
      chai.request(server)
        .get('/api/replies/testBoard')
        .query({ thread_id: testThreadId })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body._id, testThreadId);
          testReplyId = res.body.replies[0]._id;
          done();
        });
    });

    test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
      chai.request(server)
        .put('/api/replies/testBoard')
        .send({ thread_id: testThreadId, reply_id: testReplyId })
        .end(function(err, res) {
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('Deleting a reply with correct password: DELETE request to /api/replies/{board}', function(done) {
      chai.request(server)
        .delete('/api/replies/testBoard')
        .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'password' })
        .end(function(err, res) {
          assert.equal(res.text, 'success');
          done();
        });
    });

    // Final clean up: Delete the test thread
    test('Deleting a thread with correct password: DELETE request to /api/threads/{board}', function(done) {
      chai.request(server)
        .delete('/api/threads/testBoard')
        .send({ thread_id: testThreadId, delete_password: 'password' })
        .end(function(err, res) {
          assert.equal(res.text, 'success');
          done();
        });
    });
  });
});