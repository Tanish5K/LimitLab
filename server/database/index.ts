import express from "express";

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

function randomLatency(min = 20, max = 200) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get("/resource/:id", async (req, res) => {
  const { id } = req.params;
  const latency = req.query.latency ? Number(req.query.latency) : randomLatency();

  await sleep(latency);

  res.json({
    id,
    data: `payload-for-resource-${id}`,
    latencyMs: latency,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Dummy backend running on port ${PORT}`);
});