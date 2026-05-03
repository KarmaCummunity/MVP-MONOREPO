-- Allow task priority values: none, low, medium, high, critical, urgent (max length 8)
ALTER TABLE tasks ALTER COLUMN priority TYPE VARCHAR(20);
