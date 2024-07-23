export async function findAll(client) {
  let responses = [];
  try {
    await client.connect();
    responses = await client
      .db("test")
      .collection("responses")
      .find()
      .sort({ _id: -1 })
      .limit(3)
      .toArray();
  } catch (e) {
    console.log(e);
  } finally {
    return responses;
  }
}

export async function insertOne(client, response) {
  try {
    await client.connect();
    client.db("test").collection("responses").insertOne(response);
  } catch (e) {
    console.log(e);
  }
}
