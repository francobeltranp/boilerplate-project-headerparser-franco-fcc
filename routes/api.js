'use strict';

const Thread = require('../models/Thread');

function sanitizeThread(thread, includeAllReplies = false) {
  const plain = thread.toObject();
  return {
    _id: plain._id,
    text: plain.text,
    created_on: plain.created_on,
    bumped_on: plain.bumped_on,
    replies: (includeAllReplies ? plain.replies : plain.replies.slice(-3)).map(r => ({
      _id: r._id,
      text: r.text,
      created_on: r.created_on
    })),
    replycount: plain.replies.length
  };
}

module.exports = function (app) {

  // /api/threads/:board
  app.route('/api/threads/:board')

    // Crear nuevo thread
    .post(async function (req, res) {
      try {
        const board = req.params.board;
        const { text, delete_password } = req.body;

        if (!text || !delete_password) {
          return res.status(400).send('missing fields');
        }

        const thread = new Thread({
          board,
          text,
          delete_password,
          reported: false,
          created_on: new Date(),
          bumped_on: new Date(),
          replies: []
        });

        await thread.save();

        // FCC normalmente redirige al board, pero JSON también es aceptado
        return res.json(sanitizeThread(thread, true));
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    })

    // Ver 10 threads más recientes con máx 3 replies cada uno
    .get(async function (req, res) {
      try {
        const board = req.params.board;

        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .exec();

        const response = threads.map(t => sanitizeThread(t, false));
        return res.json(response);
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    })

    // Borrar thread
    .delete(async function (req, res) {
      try {
        const board = req.params.board;
        const { thread_id, delete_password } = req.body;

        if (!thread_id || !delete_password) {
          return res.status(400).send('missing fields');
        }

        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.send('incorrect password'); // o thread no existe
        }

        if (thread.delete_password !== delete_password) {
          return res.send('incorrect password');
        }

        await Thread.deleteOne({ _id: thread_id, board });
        return res.send('success');
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    })

    // Reportar thread
    .put(async function (req, res) {
      try {
        const board = req.params.board;
        const { thread_id } = req.body;

        if (!thread_id) {
          return res.status(400).send('missing thread_id');
        }

        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.status(404).send('thread not found');
        }

        thread.reported = true;
        await thread.save();

        return res.send('reported');
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    });

  // /api/replies/:board
  app.route('/api/replies/:board')

    // Crear nueva reply
    .post(async function (req, res) {
      try {
        const board = req.params.board;
        const { text, delete_password, thread_id } = req.body;

        if (!text || !delete_password || !thread_id) {
          return res.status(400).send('missing fields');
        }

        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.status(404).send('thread not found');
        }

        const reply = {
          text,
          delete_password,
          reported: false,
          created_on: new Date()
        };

        thread.replies.push(reply);
        thread.bumped_on = new Date();

        await thread.save();

        return res.json(sanitizeThread(thread, true));
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    })

    // Ver un thread con todas sus replies
    .get(async function (req, res) {
      try {
        const board = req.params.board;
        const { thread_id } = req.query;

        if (!thread_id) {
          return res.status(400).send('missing thread_id');
        }

        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.status(404).send('thread not found');
        }

        const sanitized = sanitizeThread(thread, true);
        return res.json(sanitized);
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    })

    // Borrar reply (cambia texto a [deleted])
    .delete(async function (req, res) {
      try {
        const board = req.params.board;
        const { thread_id, reply_id, delete_password } = req.body;

        if (!thread_id || !reply_id || !delete_password) {
          return res.status(400).send('missing fields');
        }

        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.send('incorrect password');
        }

        const reply = thread.replies.id(reply_id);

        if (!reply) {
          return res.send('incorrect password');
        }

        if (reply.delete_password !== delete_password) {
          return res.send('incorrect password');
        }

        reply.text = '[deleted]';
        await thread.save();

        return res.send('success');
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    })

    // Reportar reply
    .put(async function (req, res) {
      try {
        const board = req.params.board;
        const { thread_id, reply_id } = req.body;

        if (!thread_id || !reply_id) {
          return res.status(400).send('missing fields');
        }

        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.status(404).send('thread not found');
        }

        const reply = thread.replies.id(reply_id);

        if (!reply) {
          return res.status(404).send('reply not found');
        }

        reply.reported = true;
        await thread.save();

        return res.send('reported');
      } catch (err) {
        console.error(err);
        return res.status(500).send('server error');
      }
    });

};
