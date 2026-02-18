import { Pool, QueryResult } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ============================================================================
// Direct PostgreSQL pool (local development via Docker)
// ============================================================================
let pool: Pool | null = null;

if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL });
}

// ============================================================================
// Supabase-compatible wrapper around pg Pool
// Provides .from(table).select/insert/update/delete/upsert chain API
// so all existing route code works unchanged.
// ============================================================================

interface PgChain {
  select(columns?: string, opts?: { count?: string; head?: boolean }): PgChain;
  insert(data: any): PgChain;
  update(data: any): PgChain;
  upsert(data: any, opts?: { onConflict?: string }): PgChain;
  delete(): PgChain;
  eq(column: string, value: any): PgChain;
  neq(column: string, value: any): PgChain;
  gt(column: string, value: any): PgChain;
  gte(column: string, value: any): PgChain;
  lt(column: string, value: any): PgChain;
  lte(column: string, value: any): PgChain;
  not(column: string, operator: string, value: any): PgChain;
  in(column: string, values: any[]): PgChain;
  or(filter: string): PgChain;
  ilike(column: string, pattern: string): PgChain;
  order(column: string, opts?: { ascending?: boolean }): PgChain;
  range(from: number, to: number): PgChain;
  limit(count: number): PgChain;
  single(): Promise<{ data: any; error: any; count?: number | null }>;
  maybeSingle(): Promise<{ data: any; error: any; count?: number | null }>;
  then(resolve: (val: { data: any; error: any; count?: number | null }) => void, reject?: (err: any) => void): void;
}

/**
 * Parse Supabase-style select columns that may include foreign key joins.
 * E.g. "group_id, groups(id, name)" → { ownColumns: ["group_id"], joins: [{table: "groups", columns: ["id","name"], fk: "group_id"}] }
 */
function parseSelectColumns(_table: string, columns: string) {
  const ownColumns: string[] = [];
  const joins: Array<{ joinTable: string; columns: string[]; fkColumn: string }> = [];

  // Match patterns like: tableName(col1, col2)
  const joinRegex = /(\w+)\(([^)]+)\)/g;
  let remaining = columns;
  let match;

  while ((match = joinRegex.exec(columns)) !== null) {
    const joinTable = match[1];
    const joinCols = match[2].split(',').map(c => c.trim());
    // FK convention: remove trailing 's' and add '_id' (e.g. groups → group_id)
    joins.push({ joinTable, columns: joinCols, fkColumn: `${joinTable.slice(0, -1)}_id` });
    // Also check if fk is just table_id (e.g. groups → group_id)
    // We'll try the common convention: remove trailing 's' and add '_id'
    remaining = remaining.replace(match[0], '');
  }

  // Parse remaining plain columns
  remaining.split(',').forEach(col => {
    const trimmed = col.trim();
    if (trimmed) ownColumns.push(trimmed);
  });

  return { ownColumns, joins };
}

function createPgChain(p: Pool, table: string): PgChain {
  let _op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  let _columns = '*';
  let _countMode = false;
  let _headOnly = false;
  let _insertData: any = null;
  let _updateData: any = null;
  let _upsertConflict = '';
  const _wheres: { clause: string; values: any[] }[] = [];
  let _orderBy: string | null = null;
  let _orderAsc = true;
  let _limitVal: number | null = null;
  let _offset: number | null = null;
  let _isSingle = false;
  let _isMaybeSingle = false;
  let _joins: Array<{ joinTable: string; columns: string[]; fkColumn: string }> = [];

  function paramIdx(): number {
    let count = 0;
    for (const w of _wheres) count += w.values.length;
    return count;
  }

  const chain: PgChain = {
    select(columns?: string, opts?: { count?: string; head?: boolean }) {
      _op = 'select';
      if (opts?.count === 'exact') _countMode = true;
      if (opts?.head) _headOnly = true;
      if (columns && columns !== '*') {
        const parsed = parseSelectColumns(table, columns);
        _joins = parsed.joins;
        _columns = parsed.ownColumns.length > 0 ? parsed.ownColumns.join(', ') : '*';
      }
      return chain;
    },
    insert(data: any) {
      _op = 'insert';
      _insertData = data;
      return chain;
    },
    update(data: any) {
      _op = 'update';
      _updateData = data;
      return chain;
    },
    upsert(data: any, opts?: { onConflict?: string }) {
      _op = 'upsert';
      _insertData = data;
      _upsertConflict = opts?.onConflict || '';
      return chain;
    },
    delete() {
      _op = 'delete';
      return chain;
    },
    eq(column: string, value: any) {
      const idx = paramIdx() + 1;
      _wheres.push({ clause: `${column} = $${idx}`, values: [value] });
      return chain;
    },
    neq(column: string, value: any) {
      const idx = paramIdx() + 1;
      _wheres.push({ clause: `${column} != $${idx}`, values: [value] });
      return chain;
    },
    gt(column: string, value: any) {
      const idx = paramIdx() + 1;
      _wheres.push({ clause: `${column} > $${idx}`, values: [value] });
      return chain;
    },
    gte(column: string, value: any) {
      const idx = paramIdx() + 1;
      _wheres.push({ clause: `${column} >= $${idx}`, values: [value] });
      return chain;
    },
    lt(column: string, value: any) {
      const idx = paramIdx() + 1;
      _wheres.push({ clause: `${column} < $${idx}`, values: [value] });
      return chain;
    },
    lte(column: string, value: any) {
      const idx = paramIdx() + 1;
      _wheres.push({ clause: `${column} <= $${idx}`, values: [value] });
      return chain;
    },
    not(column: string, operator: string, value: any) {
      if (operator === 'is' && value === null) {
        _wheres.push({ clause: `${column} IS NOT NULL`, values: [] });
      } else {
        const idx = paramIdx() + 1;
        _wheres.push({ clause: `NOT (${column} ${operator} $${idx})`, values: [value] });
      }
      return chain;
    },
    in(column: string, values: any[]) {
      if (values.length === 0) {
        _wheres.push({ clause: 'FALSE', values: [] });
      } else {
        const startIdx = paramIdx() + 1;
        const placeholders = values.map((_, i) => `$${startIdx + i}`).join(', ');
        _wheres.push({ clause: `${column} IN (${placeholders})`, values });
      }
      return chain;
    },
    or(filter: string) {
      // Parse Supabase-style or filter: "col1.ilike.%val%,col2.ilike.%val%"
      let currentIdx = paramIdx() + 1;
      const orParts: { clause: string; values: any[] }[] = [];

      for (const part of filter.split(',')) {
        const segments = part.trim().split('.');
        if (segments.length >= 3) {
          const col = segments[0];
          const op = segments[1];
          const val = segments.slice(2).join('.');
          if (op === 'ilike') {
            orParts.push({ clause: `${col} ILIKE $${currentIdx}`, values: [val] });
            currentIdx++;
          } else if (op === 'eq') {
            orParts.push({ clause: `${col} = $${currentIdx}`, values: [val] });
            currentIdx++;
          }
        }
      }

      if (orParts.length > 0) {
        const orClause = orParts.map(p => p.clause).join(' OR ');
        const orValues = orParts.flatMap(p => p.values);
        _wheres.push({ clause: `(${orClause})`, values: orValues });
      }
      return chain;
    },
    ilike(column: string, pattern: string) {
      const idx = paramIdx() + 1;
      _wheres.push({ clause: `${column} ILIKE $${idx}`, values: [pattern] });
      return chain;
    },
    order(column: string, opts?: { ascending?: boolean }) {
      _orderBy = column;
      _orderAsc = opts?.ascending ?? true;
      return chain;
    },
    range(from: number, to: number) {
      _offset = from;
      _limitVal = to - from + 1;
      return chain;
    },
    limit(count: number) {
      _limitVal = count;
      return chain;
    },
    single() {
      _isSingle = true;
      return execute();
    },
    maybeSingle() {
      _isMaybeSingle = true;
      return execute();
    },
    then(resolve, reject) {
      execute().then(resolve, reject);
    }
  };

  async function execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      const allValues: any[] = [];
      for (const w of _wheres) allValues.push(...w.values);
      const whereClause = _wheres.length > 0
        ? 'WHERE ' + _wheres.map(w => w.clause).join(' AND ')
        : '';

      let result: QueryResult;

      switch (_op) {
        case 'select': {
          const orderClause = _orderBy ? `ORDER BY ${table}.${_orderBy} ${_orderAsc ? 'ASC' : 'DESC'}` : '';
          const limitClause = _limitVal ? `LIMIT ${_limitVal}` : '';
          const offsetClause = _offset !== null ? `OFFSET ${_offset}` : '';

          // Build column list with optional JOINs
          let selectCols: string;
          let joinClause = '';

          if (_joins.length > 0) {
            // Prefix own columns with table name
            const ownCols = _columns === '*'
              ? [`${table}.*`]
              : _columns.split(',').map(c => `${table}.${c.trim()}`);

            // Add join table columns as JSON aggregation
            const joinSelects: string[] = [];
            const joinClauses: string[] = [];
            for (const j of _joins) {
              if (j.columns.length === 1 && j.columns[0] === '*') {
                joinSelects.push(`row_to_json(${j.joinTable}) as ${j.joinTable}`);
              } else {
                const joinCols = j.columns.map(c => `'${c}', ${j.joinTable}.${c}`).join(', ');
                joinSelects.push(`json_build_object(${joinCols}) as ${j.joinTable}`);
              }
              joinClauses.push(`LEFT JOIN ${j.joinTable} ON ${table}.${j.fkColumn} = ${j.joinTable}.id`);
            }

            selectCols = [...ownCols, ...joinSelects].join(', ');
            joinClause = joinClauses.join(' ');
          } else {
            selectCols = _columns;
          }

          // Prefix where clause columns with table name when using joins
          let adjustedWhereClause = whereClause;
          if (_joins.length > 0 && whereClause) {
            // Simple prefix: add table. before column names in WHERE
            adjustedWhereClause = whereClause.replace(
              /WHERE\s+/,
              `WHERE `
            );
            // For each where, prefix unqualified column names
            for (const w of _wheres) {
              const colMatch = w.clause.match(/^(\w+)\s/);
              if (colMatch && !colMatch[1].includes('.')) {
                adjustedWhereClause = adjustedWhereClause.replace(
                  w.clause,
                  w.clause.replace(colMatch[1], `${table}.${colMatch[1]}`)
                );
              }
            }
          }

          let count: number | null = null;
          if (_countMode) {
            const countResult = await p.query(
              `SELECT COUNT(*) FROM ${table} ${joinClause} ${adjustedWhereClause}`,
              allValues
            );
            count = parseInt(countResult.rows[0].count);
          }

          if (_headOnly) {
            return { data: null, error: null, count };
          }

          result = await p.query(
            `SELECT ${selectCols} FROM ${table} ${joinClause} ${adjustedWhereClause} ${orderClause} ${limitClause} ${offsetClause}`,
            allValues
          );

          if (_isSingle) {
            return {
              data: result.rows[0] || null,
              error: result.rows[0] ? null : { message: 'No rows found', code: 'PGRST116' },
              count
            };
          }
          if (_isMaybeSingle) {
            return {
              data: result.rows[0] || null,
              error: null,
              count
            };
          }
          return { data: result.rows, error: null, count };
        }
        case 'insert': {
          const keys = Object.keys(_insertData);
          const insertValues = Object.values(_insertData);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          result = await p.query(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            insertValues
          );
          return { data: result.rows[0], error: null };
        }
        case 'upsert': {
          const keys = Object.keys(_insertData);
          const upsertValues = Object.values(_insertData);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const updateSet = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
          result = await p.query(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})
             ON CONFLICT (${_upsertConflict}) DO UPDATE SET ${updateSet}
             RETURNING *`,
            upsertValues
          );
          return { data: result.rows[0], error: null };
        }
        case 'update': {
          const updateKeys = Object.keys(_updateData!);
          const updateValues = Object.values(_updateData!);
          // Reindex: update params come first, then where params
          const setClause = updateKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
          // Reindex where clauses
          let reindexedWhere = '';
          const reWhereValues: any[] = [];
          if (_wheres.length > 0) {
            let idx = updateKeys.length + 1;
            const parts: string[] = [];
            for (const w of _wheres) {
              let clause = w.clause;
              for (const v of w.values) {
                clause = clause.replace(/\$\d+/, `$${idx}`);
                reWhereValues.push(v);
                idx++;
              }
              parts.push(clause);
            }
            reindexedWhere = 'WHERE ' + parts.join(' AND ');
          }
          result = await p.query(
            `UPDATE ${table} SET ${setClause} ${reindexedWhere} RETURNING *`,
            [...updateValues, ...reWhereValues]
          );
          return { data: result.rows, error: null };
        }
        case 'delete': {
          result = await p.query(
            `DELETE FROM ${table} ${whereClause} RETURNING *`,
            allValues
          );
          return { data: result.rows, error: null };
        }
        default:
          return { data: null, error: { message: 'Unknown operation' } };
      }
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  return chain;
}

// ============================================================================
// Exported client: either Supabase or pg-based wrapper with same API
// ============================================================================

interface DbClient {
  from(table: string): any;
}

let supabaseExport: DbClient;

if (DATABASE_URL && pool) {
  // Local dev: wrap pg pool with Supabase-compatible API
  supabaseExport = {
    from(table: string) {
      return createPgChain(pool!, table);
    }
  };
} else if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  // Production: use real Supabase client
  supabaseExport = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema: 'public' },
    auth: { autoRefreshToken: false, persistSession: false }
  });
} else {
  throw new Error('No database configured. Set DATABASE_URL (local) or SUPABASE_URL + SUPABASE_SERVICE_KEY (production).');
}

export const supabase = supabaseExport;

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    if (pool) {
      await pool.query('SELECT 1');
      return true;
    }
    const { error } = await supabase.from('groups').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
