CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  product_name  VARCHAR(255) NOT NULL,
  status        VARCHAR(20)  NOT NULL
                CHECK (status IN ('pending', 'shipped', 'delivered')),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION notify_orders_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
  record_row orders;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_row := OLD;
  ELSE
    record_row := NEW;
  END IF;

  payload := json_build_object(
    'operation', TG_OP,
    'data', row_to_json(record_row)
  );

  PERFORM pg_notify('orders_channel', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER orders_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION notify_orders_change();

INSERT INTO orders (customer_name, product_name, status) VALUES
  ('Priya Sharma',  'Laptop',     'pending'),
  ('Arjun Mehta',  'Headphones', 'shipped'),
  ('Sara Khan',    'Monitor',    'delivered');
