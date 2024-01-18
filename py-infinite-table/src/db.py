
import sqlite3

DATABASE_PATH = '../db/test.db'


con = sqlite3.connect(DATABASE_PATH)


def create_table(cursor):
    sql = """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, 
        username TEXT NOT NULL UNIQUE, 
        password TEXT NOT NULL
        );
    """
    cursor.execute(sql)


cursor = con.cursor()

create_table(cursor)




