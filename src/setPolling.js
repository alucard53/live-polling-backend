import { insertOne } from "./db.js";

export default function setPolling(io, client) {
  let response = null;
  let question = null;
  let count = 0;
  const hasAnswered = new Map();

  io.on("connection", (socket) => {
    console.log("new conn", socket.id);

    // If there is already a question being polled, and student was not there when
    if (question !== null) {
      socket.emit("question", {
        prompt: question.prompt,
        time: question.time,
        options: question.options.map((option) => option.value),
      });
    }

    socket.on("student", () => {
      hasAnswered.set(socket.id, false);
      count++;
    });

    // new question is added
    socket.on("newQuestion", (q) => {
      question = q;

      // set initial response and student count
      count = io.engine.clientsCount - 1;
      response = {
        prompt: q.prompt,
        options: q.options.map((option) => ({ ...option, count: 0 })),
      };

      // send question to students
      io.emit("question", {
        prompt: q.prompt,
        time: q.time,
        options: q.options.map((option) => option.value),
      });
    });

    // student submits answer
    socket.on("answer", (answer) => {
      hasAnswered.set(socket.id, true);

      if (!response || count <= 0) {
        console.log("expired/nonexistent question");
        return;
      }

      count--;
      if (answer !== null) {
        response.options[answer].count++;
      }
      io.emit("poll", response);

      if (count === 0) {
        if (response) {
          insertOne(client, response);
          response = null;
        }
        io.emit("allanswered");
        question = null;
      }
    });

    socket.on("disconnect", () => {
      // student disconnects before answering
      if (
        hasAnswered.has(socket.id) &&
        !hasAnswered.get(socket.id) &&
        count > 0
      ) {
        count--;
      }
      hasAnswered.delete(socket.id);

      if (count === 0) {
        if (response) {
          insertOne(client, response);
          response = null;
        }
        io.emit("allanswered");
        question = null;
      }
      console.log(`${socket.id} disconnected`);
    });
  });
}
