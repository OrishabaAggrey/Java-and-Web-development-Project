-- SQL script to update the tasks table for date-based filtering
-- Run this in your MySQL client (e.g., MySQL Workbench or command line)

-- First, backup your data (optional but recommended)
-- CREATE TABLE tasks_backup AS SELECT * FROM tasks;

-- Alter the table to change day to due_date
ALTER TABLE tasks CHANGE COLUMN day due_date DATE DEFAULT NULL;

-- Add indexes for better performance
ALTER TABLE tasks ADD INDEX idx_due_date (due_date);
ALTER TABLE tasks ADD INDEX idx_frequency (frequency);

-- If you have existing data in day (as INT), you may need to convert it
-- But since day was 0-6 for days of week, and now due_date is DATE,
-- existing tasks might need manual adjustment or deletion if not compatible.