import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// TODO: replace with your real auth/ACL check
function assertAdmin(req: Request) {
  // Example: if you already have req.user.role
  // if (req.user?.role !== "admin") throw new Error("forbidden");
  return true;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

router.post(
  "/api/admin/country-names/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      assertAdmin(req);

      const lang = String(req.query.lang || "").toLowerCase();
      if (lang !== "en" && lang !== "fr") {
        return res.status(400).json({ error: "Query param ?lang=en|fr is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "CSV file is required (form field name: file)" });
      }

      // Parse CSV (expects headers: iso3,display_name)
      const csv = req.file.buffer.toString("utf8");
      const records: { iso3: string; display_name: string }[] = await new Promise((resolve, reject) => {
        parse(csv, { columns: true, skip_empty_lines: true, trim: true }, (err, recs) => {
          if (err) return reject(err);
          resolve(recs as { iso3: string; display_name: string }[]);
        });
      });

      // Basic validation
      const badHeaders =
        !records.length ||
        !("iso3" in records[0]) ||
        !("display_name" in records[0]);
      if (badHeaders) {
        return res.status(400).json({ error: "CSV must have headers: iso3,display_name" });
      }

      // Normalize and validate ISO-3
      const clean = records
        .map((r) => ({
          iso3: (r.iso3 || "").toUpperCase().trim(),
          display_name: (r.display_name || "").trim(),
        }))
        .filter((r) => r.iso3 && r.display_name);

      const invalid = clean.filter((r) => !/^[A-Z]{3}$/.test(r.iso3));
      if (invalid.length) {
        return res.status(400).json({
          error: "Invalid ISO-3 codes found",
          examples: invalid.slice(0, 5),
        });
      }

      // Upsert in a single transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Ensure table has en/fr columns (as per earlier step)
        await client.query(`
          alter table if exists country_names
            add column if not exists display_name_en text,
            add column if not exists display_name_fr text
        `);

        let inserted = 0;
        let updated = 0;

        for (const row of clean) {
          const col = lang === "fr" ? "display_name_fr" : "display_name_en";
          const q = `
            insert into country_names (iso3, ${col})
            values ($1, $2)
            on conflict (iso3) do update set ${col} = excluded.${col}
            returning (xmax = 0) as inserted
          `;
          const { rows } = await client.query(q, [row.iso3, row.display_name]);
          if (rows[0]?.inserted) inserted++;
          else updated++;
        }

        await client.query("COMMIT");
        return res.json({
          ok: true,
          lang,
          processed: clean.length,
          inserted,
          updated,
        });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("[admin country-names upload] error:", err);
      return res.status(500).json({ error: err.message || "Upload failed" });
    }
  }
);

export default router;