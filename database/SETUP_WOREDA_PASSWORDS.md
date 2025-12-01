# Setting Up Unique Passwords for Woreda Managers

This guide explains how to set up unique 4-digit passwords for each woreda manager.

## Steps

### 1. Run the Migration

First, run the migration script to create the `woreda_managers` table:

```bash
psql -U your_username -d cropin_grow -f database/migration_add_woreda_managers.sql
```

Or if you're using a different database client, execute the SQL in `database/migration_add_woreda_managers.sql`.

### 2. Generate Unique Passwords

Run the Node.js script to generate unique 4-digit passwords for all existing woreda managers:

```bash
node database/populate_woreda_manager_passwords.js
```

This script will:
- Find all distinct woreda managers from the `da_users` table
- Generate a unique 4-digit password (1000-9999) for each manager
- Insert or update records in the `woreda_managers` table
- Display all generated passwords so you can distribute them to managers

### 3. View Generated Passwords

After running the script, you can view all passwords by querying the database:

```sql
SELECT phone_number, manager_name, password 
FROM woreda_managers 
ORDER BY phone_number;
```

### 4. Distribute Passwords

Each woreda manager should receive:
- Their phone number (used as username)
- Their unique 4-digit password

## Adding New Woreda Managers

When a new woreda manager is added to the system:

1. The manager's phone number should be in the `reporting_manager_mobile` field of `da_users` table
2. Run the populate script again - it will automatically add the new manager with a unique password
3. Or manually insert:

```sql
INSERT INTO woreda_managers (phone_number, password, manager_name)
VALUES ('9XXXXXXXXX', '1234', 'Manager Name')
ON CONFLICT (phone_number) DO UPDATE 
SET password = EXCLUDED.password, 
    manager_name = EXCLUDED.manager_name,
    updated_at = CURRENT_TIMESTAMP;
```

## Resetting a Password

To reset a woreda manager's password:

```sql
UPDATE woreda_managers 
SET password = '1234', updated_at = CURRENT_TIMESTAMP
WHERE phone_number = '9XXXXXXXXX';
```

Make sure the new password is unique (4 digits, 1000-9999).

## Notes

- All passwords are 4-digit numbers (1000-9999)
- Each password is unique across all managers
- Passwords are stored in plain text (as they are only 4 digits)
- The system validates both phone number and password during login

