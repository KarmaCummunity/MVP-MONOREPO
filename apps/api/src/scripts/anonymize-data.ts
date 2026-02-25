import * as fs from "fs";
import * as path from "path";

/**
 * Script to anonymize sensitive data exported from production
 * Masks emails and phone numbers to protect user privacy in dev environment
 */
function anonymizeData() {
  const exportDir = path.join(process.cwd(), "data-export");
  const anonymizedDir = path.join(process.cwd(), "data-export-anonymized");

  if (!fs.existsSync(exportDir)) {
    console.error("❌ Export directory not found. Run export-data.ts first.");
    return;
  }

  if (!fs.existsSync(anonymizedDir)) {
    fs.mkdirSync(anonymizedDir);
  }

  const files = fs.readdirSync(exportDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    console.log(`Anonymizing ${file}...`);
    const data = JSON.parse(
      fs.readFileSync(path.join(exportDir, file), "utf8"),
    );

    // Logic to identify and mask sensitive fields
    const anonymized = data.map((row: Record<string, unknown>) => {
      const newRow = { ...row };

      // Mask common sensitive fields
      if (newRow["email"]) {
        newRow["email"] =
          `user_${Math.random().toString(36).substring(7)}@dev.test`;
      }

      if (newRow["phone"]) {
        newRow["phone"] = "0500000000";
      }

      if (newRow["phoneNumber"]) {
        newRow["phoneNumber"] = "0500000000";
      }

      // If it's the users table, maybe reset some other fields
      if (file === "users.json" || file === "Users.json") {
        // Keep display names for testing, but mask real identity if needed
        // newRow.displayName = `Dev User ${row.id.substring(0,4)}`;
      }

      return newRow;
    });

    fs.writeFileSync(
      path.join(anonymizedDir, file),
      JSON.stringify(anonymized, null, 2),
    );
  }

  console.log(`✅ Anonymization completed! Data saved to ${anonymizedDir}`);
}

anonymizeData();
