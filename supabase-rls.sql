-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS on expenses table
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Users can view their own expenses" 
ON "Expense" FOR SELECT 
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own expenses" 
ON "Expense" FOR INSERT 
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own expenses" 
ON "Expense" FOR UPDATE 
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own expenses" 
ON "Expense" FOR DELETE 
USING (auth.uid()::text = "userId");

-- Categories are public read
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" 
ON "Category" FOR SELECT 
TO authenticated 
USING (true);
