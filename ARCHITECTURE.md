# Server Routes (Running on Port 3000)
GET  /                          -> health check message  
GET  /health                    -> health check  
GET  /resource/:id              -> proxies to backend, rate-limited  
GET  /api/rate-limiter/config   -> current algorithm + settings  
POST /api/rate-limiter/config   -> update algorithm + settings  
GET  /api/rate-limiter/metrics  -> allowed/rejected/queued totals  
POST /api/rate-limiter/metrics/reset -> clear metrics  