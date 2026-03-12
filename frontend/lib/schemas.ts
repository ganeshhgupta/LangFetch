export interface Column {
  name: string
  type: string
  isPK?: boolean
  isFK?: boolean
  nullable?: boolean
}

export interface Table {
  name: string
  rows: number
  columns: Column[]
  sampleData?: Record<string, string | number | null>[]
}

export interface SampleQuery {
  label: string
  prompt: string
  sql: string
  explanation: string
  tip: string
}

export interface Schema {
  id: string
  name: string
  icon: string
  description: string
  color: string
  tables: Table[]
  queries: SampleQuery[]
}

export const SCHEMAS: Schema[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    icon: '🛒',
    description: 'Online retail platform — orders, products, customers',
    color: '#1A73E8',
    tables: [
      {
        name: 'customers',
        rows: 84200,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'country', type: 'VARCHAR(2)' },
          { name: 'tier', type: "VARCHAR(10) DEFAULT 'free'" },
          { name: 'created_at', type: 'TIMESTAMPTZ' },
        ],
        sampleData: [
          { id: 1, email: 'alice@email.com', name: 'Alice Chen', country: 'US', tier: 'premium' },
          { id: 2, email: 'bob@email.com', name: 'Bob Kumar', country: 'IN', tier: 'free' },
        ],
      },
      {
        name: 'orders',
        rows: 312500,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'customer_id', type: 'BIGINT', isFK: true },
          { name: 'status', type: "VARCHAR(20) DEFAULT 'pending'" },
          { name: 'total', type: 'NUMERIC(10,2)' },
          { name: 'created_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'products',
        rows: 18300,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'category', type: 'VARCHAR(100)' },
          { name: 'price', type: 'NUMERIC(10,2)' },
          { name: 'inventory', type: 'INTEGER' },
        ],
      },
      {
        name: 'order_items',
        rows: 890000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'order_id', type: 'BIGINT', isFK: true },
          { name: 'product_id', type: 'BIGINT', isFK: true },
          { name: 'quantity', type: 'INTEGER' },
          { name: 'unit_price', type: 'NUMERIC(10,2)' },
        ],
      },
    ],
    queries: [
      {
        label: 'Top 10 customers by revenue',
        prompt: 'Show me the top 10 customers by total revenue',
        sql: `SELECT
  c.id,
  c.name,
  c.email,
  c.country,
  COUNT(o.id)          AS total_orders,
  SUM(o.total)         AS lifetime_value,
  AVG(o.total)         AS avg_order_value
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'completed'
GROUP BY c.id, c.name, c.email, c.country
ORDER BY lifetime_value DESC
LIMIT 10;`,
        explanation: 'Joins customers with their completed orders, aggregates total lifetime value, average order value, and order count, then returns the top 10 by revenue.',
        tip: 'Add an index on orders(customer_id, status) to speed up the join and filter on large order tables.',
      },
      {
        label: 'Monthly revenue trend',
        prompt: 'Show monthly revenue for the last 12 months',
        sql: `SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*)                         AS order_count,
  SUM(total)                       AS revenue,
  SUM(total) - LAG(SUM(total)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS mom_change
FROM orders
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;`,
        explanation: 'Uses DATE_TRUNC to bucket orders by month and LAG window function to compute month-over-month revenue change.',
        tip: 'Partition index on (status, created_at) eliminates full table scans for time-range queries.',
      },
      {
        label: 'Low inventory products',
        prompt: 'Find products that are running low on inventory',
        sql: `SELECT
  p.id,
  p.name,
  p.category,
  p.price,
  p.inventory,
  COALESCE(SUM(oi.quantity), 0) AS sold_last_30d
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
  AND o.created_at >= NOW() - INTERVAL '30 days'
  AND o.status = 'completed'
WHERE p.inventory < 50
GROUP BY p.id, p.name, p.category, p.price, p.inventory
ORDER BY p.inventory ASC, sold_last_30d DESC;`,
        explanation: 'Finds products with fewer than 50 units in stock and shows recent 30-day sales velocity to prioritize restocking.',
        tip: 'A partial index WHERE inventory < 50 can make stock-alert queries near-instant.',
      },
      {
        label: 'Revenue by product category',
        prompt: 'Break down revenue by product category this quarter',
        sql: `SELECT
  p.category,
  COUNT(DISTINCT o.id)   AS orders,
  SUM(oi.quantity)       AS units_sold,
  SUM(oi.quantity * oi.unit_price) AS revenue,
  ROUND(
    100.0 * SUM(oi.quantity * oi.unit_price) /
    SUM(SUM(oi.quantity * oi.unit_price)) OVER (), 2
  ) AS revenue_pct
FROM order_items oi
JOIN orders o    ON o.id = oi.order_id
JOIN products p  ON p.id = oi.product_id
WHERE o.status = 'completed'
  AND o.created_at >= DATE_TRUNC('quarter', NOW())
GROUP BY p.category
ORDER BY revenue DESC;`,
        explanation: 'Aggregates order items by product category for the current quarter, computing revenue and percentage share using a window function.',
        tip: 'Materialized views refreshed daily work well for category roll-ups accessed frequently on dashboards.',
      },
      {
        label: 'Churned customers (90 days)',
        prompt: 'Which customers have not ordered in 90 days?',
        sql: `SELECT
  c.id,
  c.name,
  c.email,
  c.tier,
  MAX(o.created_at)                        AS last_order_date,
  NOW() - MAX(o.created_at)               AS days_since_order,
  COUNT(o.id)                              AS total_orders,
  SUM(o.total)                             AS lifetime_value
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'completed'
GROUP BY c.id, c.name, c.email, c.tier
HAVING MAX(o.created_at) < NOW() - INTERVAL '90 days'
ORDER BY lifetime_value DESC;`,
        explanation: 'Identifies high-value customers who have not placed an order in 90+ days — ideal for win-back campaigns.',
        tip: 'Combine with a NOT EXISTS subquery to also include customers who have never ordered.',
      },
      {
        label: 'Average basket size by country',
        prompt: 'What is the average basket size per country?',
        sql: `SELECT
  c.country,
  COUNT(DISTINCT o.id)                        AS orders,
  ROUND(AVG(o.total), 2)                      AS avg_order_value,
  ROUND(AVG(item_counts.items_per_order), 1)  AS avg_items_per_order
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN (
  SELECT order_id, COUNT(*) AS items_per_order
  FROM order_items
  GROUP BY order_id
) item_counts ON item_counts.order_id = o.id
WHERE o.status = 'completed'
GROUP BY c.country
ORDER BY avg_order_value DESC;`,
        explanation: 'Computes average order value and average number of items per order grouped by customer country.',
        tip: 'Pre-aggregating item counts in a CTE or subquery avoids scanning order_items multiple times.',
      },
    ],
  },

  {
    id: 'streaming',
    name: 'Streaming Platform',
    icon: '🎬',
    description: 'Netflix-style video platform — content, watch history, subscriptions',
    color: '#EA4335',
    tables: [
      {
        name: 'users',
        rows: 220000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'plan', type: "VARCHAR(20) DEFAULT 'basic'" },
          { name: 'country', type: 'VARCHAR(2)' },
          { name: 'joined_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'content',
        rows: 45000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'title', type: 'VARCHAR(255)' },
          { name: 'type', type: "VARCHAR(20)" },
          { name: 'genre', type: 'VARCHAR(100)' },
          { name: 'release_year', type: 'SMALLINT' },
          { name: 'avg_rating', type: 'NUMERIC(3,2)' },
          { name: 'duration_min', type: 'INTEGER' },
        ],
      },
      {
        name: 'watch_history',
        rows: 12000000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'user_id', type: 'BIGINT', isFK: true },
          { name: 'content_id', type: 'BIGINT', isFK: true },
          { name: 'watched_at', type: 'TIMESTAMPTZ' },
          { name: 'progress_pct', type: 'SMALLINT' },
          { name: 'completed', type: 'BOOLEAN' },
        ],
      },
      {
        name: 'subscriptions',
        rows: 198000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'user_id', type: 'BIGINT', isFK: true },
          { name: 'plan', type: 'VARCHAR(20)' },
          { name: 'started_at', type: 'TIMESTAMPTZ' },
          { name: 'cancelled_at', type: 'TIMESTAMPTZ', nullable: true },
          { name: 'monthly_price', type: 'NUMERIC(6,2)' },
        ],
      },
    ],
    queries: [
      {
        label: 'Most watched content this week',
        prompt: 'What are the top 10 most watched shows this week?',
        sql: `SELECT
  c.id,
  c.title,
  c.type,
  c.genre,
  c.avg_rating,
  COUNT(wh.id)                           AS total_views,
  COUNT(DISTINCT wh.user_id)             AS unique_viewers,
  ROUND(AVG(wh.progress_pct), 1)         AS avg_completion_pct
FROM content c
JOIN watch_history wh ON wh.content_id = c.id
WHERE wh.watched_at >= NOW() - INTERVAL '7 days'
GROUP BY c.id, c.title, c.type, c.genre, c.avg_rating
ORDER BY unique_viewers DESC
LIMIT 10;`,
        explanation: 'Aggregates unique viewers and view counts from watch_history over the last 7 days, ranked by unique viewership.',
        tip: 'Partition watch_history by month (watched_at) so the 7-day filter scans only 1–2 partitions.',
      },
      {
        label: 'Subscriber churn analysis',
        prompt: 'Show monthly subscriber churn rate for the past 6 months',
        sql: `WITH monthly AS (
  SELECT
    DATE_TRUNC('month', started_at) AS month,
    COUNT(*) FILTER (WHERE cancelled_at IS NULL
      OR cancelled_at >= DATE_TRUNC('month', started_at) + INTERVAL '1 month')
      AS active_end,
    COUNT(*) FILTER (WHERE DATE_TRUNC('month', cancelled_at) =
      DATE_TRUNC('month', started_at)) AS cancelled
  FROM subscriptions
  WHERE started_at >= NOW() - INTERVAL '6 months'
  GROUP BY 1
)
SELECT
  month,
  active_end,
  cancelled,
  ROUND(100.0 * cancelled / NULLIF(active_end + cancelled, 0), 2) AS churn_rate_pct
FROM monthly
ORDER BY month;`,
        explanation: 'Computes monthly churn rate by comparing cancellations against active subscribers using FILTER aggregates.',
        tip: 'NULLIF prevents division-by-zero in months with zero activity.',
      },
      {
        label: 'Content completion rate by genre',
        prompt: 'Which genres have the highest watch completion rate?',
        sql: `SELECT
  c.genre,
  COUNT(wh.id)                             AS total_views,
  COUNT(wh.id) FILTER (WHERE wh.completed) AS completions,
  ROUND(
    100.0 * COUNT(wh.id) FILTER (WHERE wh.completed) / NULLIF(COUNT(wh.id), 0),
    1
  ) AS completion_rate_pct,
  ROUND(AVG(c.avg_rating), 2)              AS avg_content_rating
FROM content c
JOIN watch_history wh ON wh.content_id = c.id
GROUP BY c.genre
HAVING COUNT(wh.id) > 1000
ORDER BY completion_rate_pct DESC;`,
        explanation: 'Groups watch events by genre and calculates completion rate using FILTER aggregate — only genres with >1000 views included for statistical significance.',
        tip: 'FILTER aggregates are faster than CASE WHEN workarounds in PostgreSQL 9.4+.',
      },
      {
        label: 'User binge sessions',
        prompt: 'Find users who watched 3+ episodes in one sitting this month',
        sql: `WITH sessions AS (
  SELECT
    user_id,
    content_id,
    watched_at,
    LAG(watched_at) OVER (PARTITION BY user_id ORDER BY watched_at) AS prev_watch,
    CASE
      WHEN watched_at - LAG(watched_at) OVER (PARTITION BY user_id ORDER BY watched_at)
        < INTERVAL '4 hours' THEN 0 ELSE 1
    END AS new_session
  FROM watch_history
  WHERE watched_at >= DATE_TRUNC('month', NOW())
),
session_groups AS (
  SELECT *, SUM(new_session) OVER (PARTITION BY user_id ORDER BY watched_at) AS session_id
  FROM sessions
)
SELECT user_id, session_id, COUNT(*) AS episodes_in_session
FROM session_groups
GROUP BY user_id, session_id
HAVING COUNT(*) >= 3
ORDER BY episodes_in_session DESC
LIMIT 20;`,
        explanation: 'Uses a window function gap-and-island technique to identify continuous watch sessions and finds binge sessions with 3+ episodes.',
        tip: 'Gap-and-island patterns with LAG are a powerful PostgreSQL pattern for sessionization.',
      },
      {
        label: 'Revenue by subscription plan',
        prompt: 'Break down monthly recurring revenue by subscription plan',
        sql: `SELECT
  plan,
  COUNT(*) FILTER (WHERE cancelled_at IS NULL) AS active_subscribers,
  monthly_price,
  COUNT(*) FILTER (WHERE cancelled_at IS NULL) * monthly_price AS mrr,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE cancelled_at IS NULL) / NULLIF(COUNT(*), 0), 1
  ) AS retention_rate_pct
FROM subscriptions
GROUP BY plan, monthly_price
ORDER BY mrr DESC;`,
        explanation: 'Computes Monthly Recurring Revenue (MRR) per plan by multiplying active subscribers by plan price.',
        tip: 'Track MRR as a time-series by also grouping on DATE_TRUNC of started_at for growth charts.',
      },
    ],
  },

  {
    id: 'rideshare',
    name: 'Rideshare',
    icon: '🚗',
    description: 'Uber-style platform — rides, drivers, earnings, ratings',
    color: '#34A853',
    tables: [
      {
        name: 'drivers',
        rows: 38000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'city', type: 'VARCHAR(100)' },
          { name: 'vehicle_type', type: 'VARCHAR(50)' },
          { name: 'avg_rating', type: 'NUMERIC(3,2)' },
          { name: 'active', type: 'BOOLEAN' },
          { name: 'joined_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'riders',
        rows: 510000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'city', type: 'VARCHAR(100)' },
          { name: 'joined_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'trips',
        rows: 4200000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'driver_id', type: 'BIGINT', isFK: true },
          { name: 'rider_id', type: 'BIGINT', isFK: true },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'fare', type: 'NUMERIC(8,2)' },
          { name: 'distance_km', type: 'NUMERIC(6,2)' },
          { name: 'duration_min', type: 'INTEGER' },
          { name: 'city', type: 'VARCHAR(100)' },
          { name: 'started_at', type: 'TIMESTAMPTZ' },
          { name: 'ended_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'ratings',
        rows: 3900000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'trip_id', type: 'BIGINT', isFK: true },
          { name: 'rater_type', type: "VARCHAR(10)" },
          { name: 'score', type: 'SMALLINT' },
          { name: 'comment', type: 'TEXT', nullable: true },
        ],
      },
    ],
    queries: [
      {
        label: 'Top earning drivers this month',
        prompt: 'Show the top 10 earning drivers this month',
        sql: `SELECT
  d.id,
  d.name,
  d.city,
  d.vehicle_type,
  d.avg_rating,
  COUNT(t.id)          AS trips_completed,
  SUM(t.fare)          AS total_earnings,
  ROUND(AVG(t.fare), 2) AS avg_fare,
  ROUND(SUM(t.distance_km), 1) AS total_km
FROM drivers d
JOIN trips t ON t.driver_id = d.id
WHERE t.status = 'completed'
  AND t.started_at >= DATE_TRUNC('month', NOW())
GROUP BY d.id, d.name, d.city, d.vehicle_type, d.avg_rating
ORDER BY total_earnings DESC
LIMIT 10;`,
        explanation: 'Aggregates completed trips in the current month per driver, computing total earnings, average fare, and distance driven.',
        tip: 'Partition trips by month on started_at to keep month-to-date queries fast as the table grows.',
      },
      {
        label: 'Surge pricing hours by city',
        prompt: 'Which hours of the day have the most trips per city?',
        sql: `SELECT
  city,
  EXTRACT(HOUR FROM started_at)   AS hour_of_day,
  COUNT(*)                         AS trip_count,
  ROUND(AVG(fare), 2)              AS avg_fare,
  ROUND(AVG(duration_min), 1)      AS avg_duration_min,
  RANK() OVER (
    PARTITION BY city ORDER BY COUNT(*) DESC
  ) AS rank_in_city
FROM trips
WHERE status = 'completed'
  AND started_at >= NOW() - INTERVAL '30 days'
GROUP BY city, EXTRACT(HOUR FROM started_at)
ORDER BY city, rank_in_city;`,
        explanation: 'Extracts the hour from each trip timestamp to find peak demand hours per city, ranked using a window RANK function.',
        tip: 'EXTRACT(HOUR ...) on an indexed timestamptz column is fast — no cast needed in PostgreSQL.',
      },
      {
        label: 'Driver rating distribution',
        prompt: 'Show the rating distribution for all active drivers',
        sql: `SELECT
  CASE
    WHEN avg_rating >= 4.8 THEN '5 Star (4.8+)'
    WHEN avg_rating >= 4.5 THEN '4 Star (4.5–4.8)'
    WHEN avg_rating >= 4.0 THEN '3 Star (4.0–4.5)'
    ELSE 'Below 4.0'
  END AS rating_band,
  COUNT(*) AS driver_count,
  ROUND(AVG(avg_rating), 3) AS band_avg_rating
FROM drivers
WHERE active = TRUE
GROUP BY 1
ORDER BY band_avg_rating DESC;`,
        explanation: 'Buckets active drivers into rating bands using a CASE expression and counts drivers in each band.',
        tip: 'Add a CHECK constraint on avg_rating to ensure values stay in [1,5] range.',
      },
      {
        label: 'Rider retention cohorts',
        prompt: 'Show rider retention by join month cohort',
        sql: `WITH cohorts AS (
  SELECT
    r.id AS rider_id,
    DATE_TRUNC('month', r.joined_at) AS cohort_month
  FROM riders r
),
activity AS (
  SELECT
    t.rider_id,
    DATE_TRUNC('month', t.started_at) AS activity_month
  FROM trips t
  WHERE t.status = 'completed'
  GROUP BY t.rider_id, DATE_TRUNC('month', t.started_at)
)
SELECT
  c.cohort_month,
  COUNT(DISTINCT c.rider_id)          AS cohort_size,
  COUNT(DISTINCT a.rider_id)
    FILTER (WHERE a.activity_month = c.cohort_month + INTERVAL '1 month')
    AS retained_month_1,
  COUNT(DISTINCT a.rider_id)
    FILTER (WHERE a.activity_month = c.cohort_month + INTERVAL '3 months')
    AS retained_month_3
FROM cohorts c
LEFT JOIN activity a ON a.rider_id = c.rider_id
GROUP BY c.cohort_month
ORDER BY c.cohort_month;`,
        explanation: 'Classic cohort retention analysis — groups riders by signup month and tracks what fraction returned in months 1 and 3.',
        tip: 'Cohort tables benefit from a composite index on (rider_id, activity_month).',
      },
      {
        label: 'Average trip fare by distance bucket',
        prompt: 'How does fare correlate with trip distance?',
        sql: `SELECT
  CASE
    WHEN distance_km < 3   THEN '< 3 km'
    WHEN distance_km < 10  THEN '3–10 km'
    WHEN distance_km < 25  THEN '10–25 km'
    ELSE '25+ km'
  END AS distance_bucket,
  COUNT(*)                       AS trips,
  ROUND(AVG(fare), 2)            AS avg_fare,
  ROUND(AVG(fare / NULLIF(distance_km, 0)), 2) AS fare_per_km,
  ROUND(AVG(duration_min), 1)    AS avg_duration_min
FROM trips
WHERE status = 'completed'
  AND distance_km > 0
GROUP BY 1
ORDER BY MIN(distance_km);`,
        explanation: 'Buckets trips by distance and computes average fare and fare-per-km, revealing how pricing scales with distance.',
        tip: 'NULLIF(distance_km, 0) prevents division by zero for edge-case zero-distance trips.',
      },
    ],
  },

  {
    id: 'devplatform',
    name: 'Dev Platform',
    icon: '⚙️',
    description: 'GitHub-style platform — repos, commits, pull requests, issues',
    color: '#FBBC04',
    tables: [
      {
        name: 'users',
        rows: 9500000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'login', type: 'VARCHAR(100)' },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'plan', type: "VARCHAR(20) DEFAULT 'free'" },
          { name: 'created_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'repositories',
        rows: 48000000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'owner_id', type: 'BIGINT', isFK: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'language', type: 'VARCHAR(100)' },
          { name: 'stars', type: 'INTEGER' },
          { name: 'forks', type: 'INTEGER' },
          { name: 'is_private', type: 'BOOLEAN' },
          { name: 'created_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'commits',
        rows: 2100000000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'repo_id', type: 'BIGINT', isFK: true },
          { name: 'author_id', type: 'BIGINT', isFK: true },
          { name: 'sha', type: 'CHAR(40)' },
          { name: 'message', type: 'TEXT' },
          { name: 'additions', type: 'INTEGER' },
          { name: 'deletions', type: 'INTEGER' },
          { name: 'committed_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'pull_requests',
        rows: 380000000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'repo_id', type: 'BIGINT', isFK: true },
          { name: 'author_id', type: 'BIGINT', isFK: true },
          { name: 'title', type: 'TEXT' },
          { name: 'state', type: "VARCHAR(10)" },
          { name: 'merged_at', type: 'TIMESTAMPTZ', nullable: true },
          { name: 'created_at', type: 'TIMESTAMPTZ' },
          { name: 'review_count', type: 'INTEGER' },
        ],
      },
    ],
    queries: [
      {
        label: 'Most starred repos by language',
        prompt: 'Show the top repositories ranked by stars for each programming language',
        sql: `SELECT
  language,
  id,
  name,
  stars,
  forks,
  ROUND(forks::NUMERIC / NULLIF(stars, 0), 3) AS fork_ratio,
  ROW_NUMBER() OVER (PARTITION BY language ORDER BY stars DESC) AS rank_in_language
FROM repositories
WHERE language IS NOT NULL
  AND is_private = FALSE
  AND stars > 100
QUALIFY rank_in_language <= 5
ORDER BY language, rank_in_language;`,
        explanation: 'Uses ROW_NUMBER window function partitioned by language to rank repos within each language by star count.',
        tip: 'A partial index on (language, stars DESC) WHERE is_private = FALSE makes this query extremely fast.',
      },
      {
        label: 'Developer commit activity heatmap',
        prompt: 'Show commit frequency by hour and day of week',
        sql: `SELECT
  EXTRACT(DOW FROM committed_at)   AS day_of_week,  -- 0=Sun
  EXTRACT(HOUR FROM committed_at)  AS hour_of_day,
  COUNT(*)                          AS commit_count,
  SUM(additions + deletions)        AS lines_changed,
  COUNT(DISTINCT author_id)         AS unique_authors
FROM commits
WHERE committed_at >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2
ORDER BY 1, 2;`,
        explanation: 'Builds a contribution heatmap by extracting day-of-week and hour from commit timestamps — useful for visualizing team productivity patterns.',
        tip: 'For billion-row commit tables, create a pre-aggregated daily summary table refreshed nightly.',
      },
      {
        label: 'PR merge time by repo',
        prompt: 'What is the average pull request merge time per repository?',
        sql: `SELECT
  r.id,
  r.name,
  r.language,
  r.stars,
  COUNT(pr.id)                              AS total_prs,
  COUNT(pr.id) FILTER (WHERE pr.state = 'merged') AS merged_prs,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 3600
  ) FILTER (WHERE pr.state = 'merged'), 1) AS avg_merge_hours,
  ROUND(AVG(pr.review_count), 1)           AS avg_reviews_per_pr
FROM repositories r
JOIN pull_requests pr ON pr.repo_id = r.id
WHERE r.stars > 500
  AND pr.created_at >= NOW() - INTERVAL '6 months'
GROUP BY r.id, r.name, r.language, r.stars
HAVING COUNT(pr.id) >= 10
ORDER BY avg_merge_hours ASC NULLS LAST
LIMIT 20;`,
        explanation: 'Computes average time-to-merge in hours for repos with 500+ stars and at least 10 PRs in the last 6 months.',
        tip: 'EXTRACT(EPOCH FROM interval) / 3600 converts PostgreSQL intervals to hours reliably.',
      },
      {
        label: 'Top contributors across all repos',
        prompt: 'Who are the top 20 contributors by lines of code changed?',
        sql: `SELECT
  u.id,
  u.login,
  u.plan,
  COUNT(DISTINCT c.repo_id)   AS repos_contributed,
  COUNT(c.id)                  AS total_commits,
  SUM(c.additions)             AS lines_added,
  SUM(c.deletions)             AS lines_deleted,
  SUM(c.additions + c.deletions) AS total_churn
FROM users u
JOIN commits c ON c.author_id = u.id
WHERE c.committed_at >= NOW() - INTERVAL '1 year'
GROUP BY u.id, u.login, u.plan
ORDER BY total_churn DESC
LIMIT 20;`,
        explanation: 'Aggregates commit stats across all repositories per user, measuring code churn (additions + deletions) as a proxy for contribution volume.',
        tip: 'Index on commits(author_id, committed_at) covers both the join and the WHERE filter.',
      },
      {
        label: 'Repository growth over time',
        prompt: 'Show how total repository count has grown month over month',
        sql: `SELECT
  DATE_TRUNC('month', created_at)      AS month,
  COUNT(*)                              AS new_repos,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS cumulative_repos,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) -
    LAG(SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)))
    OVER (ORDER BY DATE_TRUNC('month', created_at)) AS mom_growth
FROM repositories
GROUP BY 1
ORDER BY 1;`,
        explanation: 'Uses nested window functions to compute both a running total and month-over-month growth from a single scan of the repositories table.',
        tip: 'Nested window functions are a powerful PostgreSQL pattern — no self-join needed.',
      },
    ],
  },

  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    description: 'Hospital system — patients, encounters, diagnoses, prescriptions',
    color: '#EA4335',
    tables: [
      {
        name: 'patients',
        rows: 180000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'mrn', type: 'VARCHAR(20)' },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'dob', type: 'DATE' },
          { name: 'gender', type: 'CHAR(1)' },
          { name: 'zip_code', type: 'VARCHAR(10)' },
          { name: 'insurance_type', type: 'VARCHAR(50)' },
        ],
      },
      {
        name: 'encounters',
        rows: 2400000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'patient_id', type: 'BIGINT', isFK: true },
          { name: 'provider_id', type: 'BIGINT', isFK: true },
          { name: 'encounter_type', type: 'VARCHAR(50)' },
          { name: 'facility', type: 'VARCHAR(100)' },
          { name: 'admit_date', type: 'DATE' },
          { name: 'discharge_date', type: 'DATE', nullable: true },
          { name: 'total_charge', type: 'NUMERIC(10,2)' },
        ],
      },
      {
        name: 'diagnoses',
        rows: 5800000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'encounter_id', type: 'BIGINT', isFK: true },
          { name: 'icd10_code', type: 'VARCHAR(10)' },
          { name: 'description', type: 'TEXT' },
          { name: 'is_primary', type: 'BOOLEAN' },
          { name: 'diagnosed_at', type: 'TIMESTAMPTZ' },
        ],
      },
      {
        name: 'prescriptions',
        rows: 3200000,
        columns: [
          { name: 'id', type: 'BIGSERIAL', isPK: true },
          { name: 'encounter_id', type: 'BIGINT', isFK: true },
          { name: 'drug_name', type: 'VARCHAR(255)' },
          { name: 'dosage', type: 'VARCHAR(100)' },
          { name: 'days_supply', type: 'INTEGER' },
          { name: 'prescribed_at', type: 'TIMESTAMPTZ' },
          { name: 'refills', type: 'SMALLINT' },
        ],
      },
    ],
    queries: [
      {
        label: 'Readmission rate within 30 days',
        prompt: 'What percentage of inpatients are readmitted within 30 days?',
        sql: `WITH inpatient AS (
  SELECT
    patient_id,
    admit_date,
    discharge_date,
    LEAD(admit_date) OVER (
      PARTITION BY patient_id ORDER BY admit_date
    ) AS next_admit_date
  FROM encounters
  WHERE encounter_type = 'inpatient'
    AND discharge_date IS NOT NULL
)
SELECT
  DATE_TRUNC('quarter', admit_date) AS quarter,
  COUNT(*)                           AS total_discharges,
  COUNT(*) FILTER (
    WHERE next_admit_date - discharge_date <= 30
  ) AS readmissions_30d,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE next_admit_date - discharge_date <= 30)
    / NULLIF(COUNT(*), 0), 2
  ) AS readmission_rate_pct
FROM inpatient
GROUP BY 1
ORDER BY 1;`,
        explanation: 'Uses LEAD window function to find the next admission date per patient and calculates the 30-day readmission rate by quarter.',
        tip: 'LEAD/LAG over (PARTITION BY patient_id ORDER BY admit_date) is the standard pattern for sequential encounter analysis.',
      },
      {
        label: 'Most prescribed medications',
        prompt: 'What are the top 15 most prescribed drugs this year?',
        sql: `SELECT
  p.drug_name,
  COUNT(*)                        AS prescription_count,
  COUNT(DISTINCT e.patient_id)    AS unique_patients,
  ROUND(AVG(p.days_supply), 1)    AS avg_days_supply,
  ROUND(AVG(p.refills), 2)        AS avg_refills,
  SUM(p.refills + 1)              AS total_fills
FROM prescriptions p
JOIN encounters e ON e.id = p.encounter_id
WHERE p.prescribed_at >= DATE_TRUNC('year', NOW())
GROUP BY p.drug_name
ORDER BY prescription_count DESC
LIMIT 15;`,
        explanation: 'Aggregates prescriptions by drug name for the current year, showing unique patients and average supply metrics.',
        tip: 'An index on prescriptions(prescribed_at, drug_name) makes this query scan only the current year\'s data.',
      },
      {
        label: 'Average length of stay by diagnosis',
        prompt: 'What is the average hospital length of stay per diagnosis category?',
        sql: `SELECT
  d.icd10_code,
  SPLIT_PART(d.description, ' ', 1) AS diagnosis_category,
  COUNT(DISTINCT e.id)              AS encounters,
  ROUND(AVG(
    e.discharge_date - e.admit_date
  ), 1)                              AS avg_los_days,
  ROUND(AVG(e.total_charge), 0)     AS avg_charge,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY e.discharge_date - e.admit_date
  ) AS median_los_days
FROM encounters e
JOIN diagnoses d ON d.encounter_id = e.id AND d.is_primary = TRUE
WHERE e.encounter_type = 'inpatient'
  AND e.discharge_date IS NOT NULL
GROUP BY d.icd10_code, SPLIT_PART(d.description, ' ', 1)
HAVING COUNT(DISTINCT e.id) > 50
ORDER BY avg_los_days DESC
LIMIT 20;`,
        explanation: 'Joins encounters with primary diagnoses and computes average and median length of stay using both AVG and PERCENTILE_CONT ordered-set aggregate.',
        tip: 'PERCENTILE_CONT is an ordered-set aggregate that computes true median, unlike AVG which is skewed by outliers.',
      },
      {
        label: 'Patient age demographics',
        prompt: 'Show patient distribution by age group and insurance type',
        sql: `SELECT
  CASE
    WHEN EXTRACT(YEAR FROM AGE(NOW()::DATE, dob)) < 18  THEN '0–17'
    WHEN EXTRACT(YEAR FROM AGE(NOW()::DATE, dob)) < 35  THEN '18–34'
    WHEN EXTRACT(YEAR FROM AGE(NOW()::DATE, dob)) < 50  THEN '35–49'
    WHEN EXTRACT(YEAR FROM AGE(NOW()::DATE, dob)) < 65  THEN '50–64'
    ELSE '65+'
  END AS age_group,
  insurance_type,
  COUNT(*)                     AS patient_count,
  ROUND(AVG(
    EXTRACT(YEAR FROM AGE(NOW()::DATE, dob))
  ), 1)                         AS avg_age
FROM patients
GROUP BY 1, insurance_type
ORDER BY 1, patient_count DESC;`,
        explanation: 'Uses PostgreSQL AGE() and EXTRACT to compute patient age in years from date of birth and buckets into standard clinical age groups.',
        tip: 'Store a pre-computed age_bucket column if this query runs frequently — date arithmetic is cheap but bucket logic adds overhead.',
      },
      {
        label: 'High-cost encounter outliers',
        prompt: 'Find encounters with charges significantly above average',
        sql: `WITH stats AS (
  SELECT
    encounter_type,
    AVG(total_charge)    AS mean_charge,
    STDDEV(total_charge) AS stddev_charge
  FROM encounters
  WHERE discharge_date IS NOT NULL
  GROUP BY encounter_type
)
SELECT
  e.id,
  e.patient_id,
  e.encounter_type,
  e.facility,
  e.admit_date,
  e.total_charge,
  s.mean_charge,
  ROUND((e.total_charge - s.mean_charge) / NULLIF(s.stddev_charge, 0), 2) AS z_score
FROM encounters e
JOIN stats s ON s.encounter_type = e.encounter_type
WHERE e.discharge_date IS NOT NULL
  AND (e.total_charge - s.mean_charge) / NULLIF(s.stddev_charge, 0) > 3
ORDER BY z_score DESC
LIMIT 50;`,
        explanation: 'Uses a CTE to compute per-encounter-type mean and standard deviation, then finds statistical outliers with a Z-score above 3 (3 standard deviations above mean).',
        tip: 'Z-score > 3 is a common threshold for outlier detection — adjust to 2 for a more aggressive catch-rate.',
      },
    ],
  },
]

export function getSchemaById(id: string): Schema | undefined {
  return SCHEMAS.find(s => s.id === id)
}
