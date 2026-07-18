import os
import subprocess
import datetime
import pyodbc

# Try importing psycopg2 for cloud PostgreSQL support
try:
    import psycopg2
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

DATABASE_URL = os.environ.get("DATABASE_URL") or "postgresql://neondb_owner:npg_8DNnSiEfjIs0@ep-soft-water-azsczfgi.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
IS_POSTGRES = HAS_POSTGRES and (DATABASE_URL is not None and (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")))

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "TRC_Database.accdb"))
CONN_STR = f"Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={DB_PATH};"

def translate_query(sql: str) -> str:
    if not sql:
        return sql
    
    # 1. Map placeholders
    sql = sql.replace('?', '%s')
    
    # 2. Map brackets and fields
    sql = sql.replace('[Password]', 'Password')
    sql = sql.replace('[Role]', 'Role')
    sql = sql.replace('[Date]', 'Date')
    sql = sql.replace('[status]', 'status')
    sql = sql.replace('[PaymentMethod]', 'PaymentMethod')
    
    # 3. Map MS Access specific date functions to PostgreSQL equivalents
    sql = sql.replace("DateSerial(Year(Date()), Month(Date()), 1)", "date_trunc('month', CURRENT_DATE)")
    sql = sql.replace("DateAdd('d', 1, Date())", "CURRENT_DATE + INTERVAL '1 day'")
    sql = sql.replace("Date()", "CURRENT_DATE")
    
    # 4. Map Identity retrieval
    sql = sql.replace("SELECT @@IDENTITY", "SELECT LASTVAL()")
    
    return sql

def map_schema_sql(sql: str) -> str:
    if IS_POSTGRES:
        sql = sql.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS')
        sql = sql.replace('COUNTER PRIMARY KEY', 'SERIAL PRIMARY KEY')
        sql = sql.replace('MEMO', 'TEXT')
        sql = sql.replace('DOUBLE', 'DOUBLE PRECISION')
        sql = sql.replace('DATETIME', 'TIMESTAMP')
        sql = sql.replace('CURRENCY', 'DECIMAL(10,2)')
    return sql

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor
        
    def __getattr__(self, name):
        return getattr(self._cursor, name)
        
    def execute(self, sql, params=None):
        sql = translate_query(sql)
        if "CREATE TABLE" in sql.upper() or "ALTER TABLE" in sql.upper() or "ADD COLUMN" in sql.upper():
            sql = map_schema_sql(sql)
        
        if params is not None:
            if not isinstance(params, (list, tuple)):
                params = (params,)
            return self._cursor.execute(sql, params)
        else:
            return self._cursor.execute(sql)
            
    def executemany(self, sql, seq_of_params):
        sql = translate_query(sql)
        if "CREATE TABLE" in sql.upper() or "ALTER TABLE" in sql.upper() or "ADD COLUMN" in sql.upper():
            sql = map_schema_sql(sql)
        return self._cursor.executemany(sql, seq_of_params)

class PostgresConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn
        
    def __getattr__(self, name):
        return getattr(self._conn, name)
        
    def cursor(self):
        return PostgresCursorWrapper(self._conn.cursor())


def create_access_db(path):
    print(f"Creating MS Access database file at: {path}")
    # Escape path for PowerShell
    escaped_path = path.replace("'", "''")
    ps_cmd = f"""
    $dbPath = '{escaped_path}'
    if (Test-Path $dbPath) {{ Remove-Item $dbPath }}
    $cat = New-Object -ComObject ADOX.Catalog
    $cat.Create("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;")
    $cat = $null
    """
    result = subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Failed to create MS Access database: {result.stderr or result.stdout}")
    print("MS Access database file created successfully.")

def run_migrations(conn):
    cursor = conn.cursor()
    # 1. Add PaymentMethod to Sales if not exists
    try:
        cursor.execute("ALTER TABLE Sales ADD COLUMN PaymentMethod VARCHAR(50)")
        cursor.execute("UPDATE Sales SET PaymentMethod = 'Cash' WHERE PaymentMethod IS NULL")
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        
    # 2. Create SyncedWebBookings table if not exists
    try:
        cursor.execute("""
            CREATE TABLE SyncedWebBookings (
                BookingID VARCHAR(50) PRIMARY KEY
            )
        """)
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass

    # 3. Create Users table if not exists
    try:
        cursor.execute("""
            CREATE TABLE Users (
                Username VARCHAR(50) PRIMARY KEY,
                Password VARCHAR(255),
                Role VARCHAR(20),
                FullName VARCHAR(100)
            )
        """)
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass

    # Seed default users if they are not in the database
    for username, password, role, fullname in [
        ("admin", "admin786", "Admin", "Administrator"),
        ("doctor", "doctor786", "Doctor", "Dr. Ahsan"),
        ("staff", "staff786", "Staff", "TRC Staff")
    ]:
        try:
            cursor.execute("UPDATE Users SET [Password] = ? WHERE Username = ?", (password, username))
            cursor.execute("INSERT INTO Users (Username, [Password], [Role], FullName) VALUES (?, ?, ?, ?)", (username, password, role, fullname))
            conn.commit()
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass

def get_db_connection():
    if IS_POSTGRES:
        try:
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
            wrapped_conn = PostgresConnectionWrapper(conn)
            try:
                cursor = wrapped_conn.cursor()
                cursor.execute("SELECT * FROM Users LIMIT 1")
            except Exception:
                conn.rollback()
                init_db(wrapped_conn)
            run_migrations(wrapped_conn)
            return wrapped_conn
        except Exception as pg_err:
            print(f"Failed to connect to cloud database (offline?): {pg_err}. Falling back to local MS Access.")

    if not os.path.exists(DB_PATH):
        create_access_db(DB_PATH)
        init_db()
    conn = pyodbc.connect(CONN_STR)
    run_migrations(conn)
    return conn


def init_db(conn=None):
    print("Initializing database tables and relationships...")
    close_at_end = False
    if conn is None:
        conn = pyodbc.connect(CONN_STR)
        close_at_end = True
    cursor = conn.cursor()
    
    # 1. Create Patients table
    cursor.execute("""
        CREATE TABLE Patients (
            PatientID COUNTER PRIMARY KEY,
            RegDate DATETIME,
            PatientName VARCHAR(255),
            FatherName VARCHAR(255),
            Gender VARCHAR(50),
            Age INTEGER,
            Mobile VARCHAR(50),
            Address MEMO,
            TreatmentType VARCHAR(255),
            Notes MEMO,
            FollowUpDate DATETIME
        )
    """)
    
    # 2. Create Appointments table
    cursor.execute("""
        CREATE TABLE Appointments (
            AppointmentID COUNTER PRIMARY KEY,
            PatientID INTEGER,
            AppointmentDate DATETIME,
            Doctor VARCHAR(255),
            Status VARCHAR(50)
        )
    """)
    
    # 3. Create Sales table
    cursor.execute("""
        CREATE TABLE Sales (
            SaleID COUNTER PRIMARY KEY,
            SaleDate DATETIME,
            PatientID INTEGER,
            ServiceName VARCHAR(255),
            Qty INTEGER,
            UnitPrice CURRENCY,
            TotalAmount CURRENCY,
            PaymentMethod VARCHAR(50) DEFAULT 'Cash'
        )
    """)
    
    # 4. Create Purchases table
    cursor.execute("""
        CREATE TABLE Purchases (
            PurchaseID COUNTER PRIMARY KEY,
            PurchaseDate DATETIME,
            SupplierName VARCHAR(255),
            ItemName VARCHAR(255),
            Qty INTEGER,
            UnitCost CURRENCY,
            TotalCost CURRENCY
        )
    """)
    
    # 5. Create Expenses table
    cursor.execute("""
        CREATE TABLE Expenses (
            ExpenseID COUNTER PRIMARY KEY,
            ExpenseDate DATETIME,
            ExpenseType VARCHAR(255),
            Amount CURRENCY,
            Remarks MEMO
        )
    """)
    
    # 6. Create Inventory table
    cursor.execute("""
        CREATE TABLE Inventory (
            ItemID COUNTER PRIMARY KEY,
            ItemName VARCHAR(255),
            OpeningStock INTEGER,
            PurchasedQty INTEGER,
            UsedQty INTEGER,
            MinStock INTEGER
        )
    """)
    
    # 7. Create FollowUp table
    cursor.execute("""
        CREATE TABLE FollowUp (
            FollowUpID COUNTER PRIMARY KEY,
            PatientID INTEGER,
            FollowUpDate DATETIME,
            Remarks MEMO
        )
    """)
    
    # 8. Create HairTransplantRecords table
    cursor.execute("""
        CREATE TABLE HairTransplantRecords (
            RecordID COUNTER PRIMARY KEY,
            PatientID INTEGER,
            SurgeryDate DATETIME,
            GraftsCount INTEGER,
            HairLineDesign VARCHAR(255),
            DonorAreaStatus VARCHAR(255),
            TreatmentStatus VARCHAR(100),
            DoctorName VARCHAR(255),
            TotalCost CURRENCY,
            AmountPaid CURRENCY,
            Remarks MEMO
        )
    """)
    
    # 9. Create PRPRecords table
    cursor.execute("""
        CREATE TABLE PRPRecords (
            RecordID COUNTER PRIMARY KEY,
            PatientID INTEGER,
            SessionDate DATETIME,
            SessionNumber INTEGER,
            TotalSessions INTEGER,
            KitTypeUsed VARCHAR(255),
            AreaTreated VARCHAR(255),
            DoctorName VARCHAR(255),
            CostPerSession CURRENCY,
            Remarks MEMO
        )
    """)
    
    conn.commit()
    print("Tables created successfully.")
    
    # Add foreign key constraints (separately to ensure clean execution)
    print("Setting up relationships...")
    try:
        cursor.execute("ALTER TABLE Appointments ADD CONSTRAINT FK_Appointments_Patients FOREIGN KEY (PatientID) REFERENCES Patients (PatientID) ON DELETE CASCADE")
        cursor.execute("ALTER TABLE Sales ADD CONSTRAINT FK_Sales_Patients FOREIGN KEY (PatientID) REFERENCES Patients (PatientID) ON DELETE CASCADE")
        cursor.execute("ALTER TABLE FollowUp ADD CONSTRAINT FK_FollowUp_Patients FOREIGN KEY (PatientID) REFERENCES Patients (PatientID) ON DELETE CASCADE")
        cursor.execute("ALTER TABLE HairTransplantRecords ADD CONSTRAINT FK_HT_Patients FOREIGN KEY (PatientID) REFERENCES Patients (PatientID) ON DELETE CASCADE")
        cursor.execute("ALTER TABLE PRPRecords ADD CONSTRAINT FK_PRP_Patients FOREIGN KEY (PatientID) REFERENCES Patients (PatientID) ON DELETE CASCADE")
        conn.commit()
        print("Relationships established successfully.")
    except Exception as e:
        print(f"Warning setting constraints (might be driver limitation): {e}")
        try:
            conn.rollback()
        except Exception:
            pass
    
    # Inject Mock Data
    print("Injecting mock data...")
    inject_mock_data(cursor)
    conn.commit()
    if close_at_end:
        conn.close()
    print("Database initialization complete!")

def inject_mock_data(cursor):
    today = datetime.datetime.now()
    yesterday = today - datetime.timedelta(days=1)
    two_days_ago = today - datetime.timedelta(days=2)
    three_days_ago = today - datetime.timedelta(days=3)
    five_days_ago = today - datetime.timedelta(days=5)
    last_month = today - datetime.timedelta(days=30)
    
    # 1. Insert Inventory items
    inventory_items = [
        ("PRP Kit", 20, 10, 28, 10),
        ("Graft Punch 1.0mm", 15, 5, 17, 10),
        ("Graft Punch 0.9mm", 10, 5, 13, 10),
        ("Anesthesia 50ml", 30, 15, 41, 10),
        ("Vitamin Injection", 40, 20, 55, 15),
        ("Derma Pen Cartridges", 50, 30, 74, 20),
        ("Hair Growth Serum", 25, 10, 28, 15),
        ("Surgical Gloves Box", 40, 20, 35, 10),
        ("Saline Water 500ml", 50, 20, 40, 15)
    ]
    for item in inventory_items:
        cursor.execute("""
            INSERT INTO Inventory (ItemName, OpeningStock, PurchasedQty, UsedQty, MinStock)
            VALUES (?, ?, ?, ?, ?)
        """, item)

    # 2. Insert Patients
    patients = [
        ("Ali Raza", "Sajid Raza", "Male", 32, "03001112222", "DHA Phase VI, Karachi", "Hair Transplant", "Referred by friend", today),
        ("Usman Khan", "Tariq Khan", "Male", 28, "03123456789", "Clifton, Karachi", "PRP Therapy", "Needs 3 sessions", today),
        ("Hamza Ahmed", "Ahmed Ali", "Male", 35, "03339876543", "Gulshan, Karachi", "Consultation", "First visit", today),
        ("Bilal Hussain", "Zakir Hussain", "Male", 24, "03456789012", "North Nazimabad, Karachi", "PRP Therapy", "Completed 1st session", today),
        ("Shahbaz Ali", "Liaqat Ali", "Male", 40, "03215554433", "PECHS, Karachi", "Hair Transplant", "Wants density adjustment", today),
        ("Farhan Saleem", "Saleem Akhter", "Male", 29, "03328889900", "Gulistan-e-Jauhar, Karachi", "Skin Treatment", "Carbon Peel", today),
        ("M. Zeeshan", "M. Yasin", "Male", 31, "03017778888", "Defence Phase II, Karachi", "PRP Therapy", "Scalp PRP", today),
        ("Saad Khan", "Bashir Khan", "Male", 27, "03154443322", "Korangi, Karachi", "Consultation", "Consultation for hair thinning", today),
        ("Sania Malik", "Irshad Malik", "Female", 26, "03243332211", "Bahria Town, Karachi", "PRP Therapy", "Face PRP for glow", yesterday),
        ("Zainab Bibi", "Farooq Bibi", "Female", 33, "03356667788", "Malir, Karachi", "Laser Treatment", "Whitening laser session", last_month)
    ]
    for p in patients:
        cursor.execute("""
            INSERT INTO Patients (PatientName, FatherName, Gender, Age, Mobile, Address, TreatmentType, Notes, RegDate, FollowUpDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[8] + datetime.timedelta(days=14)))

    # 3. Insert Appointments
    appointments = [
        (1, today.replace(hour=10, minute=0, second=0), "Dr. Ahsan", "Completed"),
        (2, today.replace(hour=11, minute=0, second=0), "Dr. Sara", "Completed"),
        (3, today.replace(hour=12, minute=0, second=0), "Dr. Ahsan", "Completed"),
        (4, today.replace(hour=14, minute=0, second=0), "Dr. Sara", "Completed"),
        (5, today.replace(hour=15, minute=0, second=0), "Dr. Ahsan", "Completed"),
        (6, today.replace(hour=16, minute=0, second=0), "Dr. Sara", "Completed"),
        (7, today.replace(hour=17, minute=0, second=0), "Dr. Ahsan", "Scheduled"),
        (8, today.replace(hour=18, minute=0, second=0), "Dr. Sara", "Scheduled"),
        (9, yesterday.replace(hour=11, minute=0, second=0), "Dr. Sara", "Completed"),
        (10, last_month.replace(hour=15, minute=0, second=0), "Dr. Ahsan", "Completed")
    ]
    for app in appointments:
        cursor.execute("""
            INSERT INTO Appointments (PatientID, AppointmentDate, Doctor, Status)
            VALUES (?, ?, ?, ?)
        """, app)

    # 4. Insert Sales
    sales = [
        (today, 1, "Hair Transplant", 1, 80000, 80000),
        (today, 2, "PRP Therapy", 1, 15000, 15000),
        (today, 3, "Consultation", 1, 2000, 2000),
        (today, 4, "PRP Therapy", 1, 15000, 15000),
        (today, 6, "Skin Treatment", 1, 25000, 25000),
        (today, 7, "PRP Therapy", 1, 15000, 15000),
        (yesterday, 9, "PRP Therapy", 1, 15000, 15000),
        (three_days_ago, 5, "Hair Transplant", 1, 90000, 90000),
        (last_month, 10, "Laser Treatment", 1, 20000, 20000)
    ]
    for s in sales:
        cursor.execute("""
            INSERT INTO Sales (SaleDate, PatientID, ServiceName, Qty, UnitPrice, TotalAmount)
            VALUES (?, ?, ?, ?, ?, ?)
        """, s)

    # 5. Insert Purchases
    purchases = [
        (yesterday, "Al-Med Distributors", "PRP Kit", 10, 1200, 12000),
        (three_days_ago, "Surgical Tools Co.", "Graft Punch 1.0mm", 5, 800, 4000),
        (five_days_ago, "Medipack PK", "Anesthesia 50ml", 15, 600, 9000)
    ]
    for pur in purchases:
        cursor.execute("""
            INSERT INTO Purchases (PurchaseDate, SupplierName, ItemName, Qty, UnitCost, TotalCost)
            VALUES (?, ?, ?, ?, ?, ?)
        """, pur)

    # 6. Insert Expenses
    expenses = [
        (five_days_ago, "Rent", 120000, "Clinic monthly rent Office 103"),
        (three_days_ago, "Electricity Bill", 45000, "KE Bill June 2026"),
        (yesterday, "Salaries", 85000, "Staff salaries payment"),
        (today, "Refreshments", 6450, "Tea, water and snacks for clinic staff and patients")
    ]
    for exp in expenses:
        cursor.execute("""
            INSERT INTO Expenses (ExpenseDate, ExpenseType, Amount, Remarks)
            VALUES (?, ?, ?, ?)
        """, exp)

    # 7. Insert FollowUps
    followups = [
        (2, today + datetime.timedelta(days=5), "Needs 2nd session of PRP"),
        (9, today + datetime.timedelta(days=3), "Post face PRP evaluation"),
        (1, today + datetime.timedelta(days=7), "Sutures removal for hair transplant")
    ]
    for f in followups:
        cursor.execute("""
            INSERT INTO FollowUp (PatientID, FollowUpDate, Remarks)
            VALUES (?, ?, ?)
        """, f)

    # 8. Insert Hair Transplant Records
    ht_records = [
        (1, today - datetime.timedelta(days=10), 2500, "Medium density", "Healthy", "Completed", "Dr. Ahsan", 80000, 80000, "Good donor area, FUE method used"),
        (5, three_days_ago, 3000, "High density", "Good density", "Completed", "Dr. Ahsan", 90000, 50000, "Crown area covered, FUE method")
    ]
    for ht in ht_records:
        cursor.execute("""
            INSERT INTO HairTransplantRecords (PatientID, SurgeryDate, GraftsCount, HairLineDesign, DonorAreaStatus, TreatmentStatus, DoctorName, TotalCost, AmountPaid, Remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ht)

    # 9. Insert PRP Records
    prp_records = [
        (2, today, 1, 3, "Regen Lab", "Scalp", "Dr. Sara", 15000, "First PRP session completed, no swelling"),
        (4, today, 2, 4, "MyCells Kit", "Scalp", "Dr. Sara", 15000, "Second PRP session, hair density checking"),
        (9, yesterday, 1, 3, "Regen Lab", "Face", "Dr. Sara", 15000, "Vampire facial PRP for acne scars")
    ]
    for prp in prp_records:
        cursor.execute("""
            INSERT INTO PRPRecords (PatientID, SessionDate, SessionNumber, TotalSessions, KitTypeUsed, AreaTreated, DoctorName, CostPerSession, Remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, prp)

def row_to_dict(cursor, row):
    if row is None:
        return None
    columns = [col[0] for col in cursor.description]
    res = {}
    for col, val in zip(columns, row):
        # Convert datetime to ISO string for JSON serialization
        if isinstance(val, datetime.datetime):
            res[col] = val.isoformat()
        # Convert decimal to float
        elif type(val).__name__ == 'Decimal':
            res[col] = float(val)
        else:
            res[col] = val
    return res

def rows_to_list(cursor, rows):
    columns = [col[0] for col in cursor.description]
    res = []
    for row in rows:
        d = {}
        for col, val in zip(columns, row):
            if isinstance(val, datetime.datetime):
                d[col] = val.isoformat()
            elif type(val).__name__ == 'Decimal':
                d[col] = float(val)
            else:
                d[col] = val
        res.append(d)
    return res
