-- Add created_by column to products table
-- This column tracks which user created the product

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
