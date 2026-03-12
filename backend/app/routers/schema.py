from fastapi import APIRouter

router = APIRouter()

DEMO_SCHEMA = {
    "tables": [
        {
            "name": "users",
            "description": "Customer accounts and profiles",
            "row_count": 15847,
            "columns": [
                {"name": "id", "type": "SERIAL", "nullable": False, "primary_key": True},
                {"name": "name", "type": "VARCHAR(255)", "nullable": False, "primary_key": False},
                {"name": "email", "type": "VARCHAR(255)", "nullable": False, "primary_key": False},
                {"name": "created_at", "type": "TIMESTAMP", "nullable": True, "primary_key": False},
            ]
        },
        {
            "name": "orders",
            "description": "Customer purchase orders",
            "row_count": 48293,
            "columns": [
                {"name": "id", "type": "SERIAL", "nullable": False, "primary_key": True},
                {"name": "user_id", "type": "INTEGER", "nullable": False, "primary_key": False, "foreign_key": "users.id"},
                {"name": "total", "type": "DECIMAL(10,2)", "nullable": False, "primary_key": False},
                {"name": "status", "type": "VARCHAR(50)", "nullable": False, "primary_key": False},
                {"name": "created_at", "type": "TIMESTAMP", "nullable": True, "primary_key": False},
            ]
        },
        {
            "name": "products",
            "description": "Product catalog",
            "row_count": 1204,
            "columns": [
                {"name": "id", "type": "SERIAL", "nullable": False, "primary_key": True},
                {"name": "name", "type": "VARCHAR(255)", "nullable": False, "primary_key": False},
                {"name": "price", "type": "DECIMAL(10,2)", "nullable": False, "primary_key": False},
                {"name": "category", "type": "VARCHAR(100)", "nullable": True, "primary_key": False},
                {"name": "stock", "type": "INTEGER", "nullable": False, "primary_key": False},
            ]
        },
        {
            "name": "order_items",
            "description": "Line items within orders",
            "row_count": 124891,
            "columns": [
                {"name": "id", "type": "SERIAL", "nullable": False, "primary_key": True},
                {"name": "order_id", "type": "INTEGER", "nullable": False, "primary_key": False, "foreign_key": "orders.id"},
                {"name": "product_id", "type": "INTEGER", "nullable": False, "primary_key": False, "foreign_key": "products.id"},
                {"name": "quantity", "type": "INTEGER", "nullable": False, "primary_key": False},
                {"name": "price", "type": "DECIMAL(10,2)", "nullable": False, "primary_key": False},
            ]
        }
    ]
}

@router.get("")
async def get_schema():
    return DEMO_SCHEMA
