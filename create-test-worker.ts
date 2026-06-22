import { drizzle } from "drizzle-orm/mysql2";
import { employers, workers } from "./drizzle/schema";
import { nanoid } from "nanoid";

const db = drizzle(process.env.DATABASE_URL!);

async function createTestWorker() {
  try {
    // Create test employer
    await db.insert(employers).values({
      name: "Test Centre",
      contactEmail: "test@centre.co.za",
      contactPhone: "+27123456789",
      address: "123 Test Street",
      city: "Johannesburg",
      province: "Gauteng",
    });

    console.log("✓ Employer created");

    // Create test worker
    const uniqueUrl = nanoid(12);
    await db.insert(workers).values({
      employerId: 1,
      fullName: "Sanet Olwage",
      role: "Car Guard",
      phoneNumber: "+27123456789",
      idNumber: "5508090077089",
      bankName: "Standard Bank",
      accountHolder: "Sanet Olwage",
      accountNumber: "281694893",
      branchCode: "050194",
      uniqueUrl: uniqueUrl,
      paystackSubaccountCode: "test-" + nanoid(8),
      notes: "Test worker for live payment testing",
    });

    console.log("✓ Worker created");
    console.log(`\n📱 Worker Tip URL: https://tipplatform-atwfz5h9.manus.space/tip/${uniqueUrl}`);
    console.log(`\n👤 Worker Details:`);
    console.log(`   Name: Sanet Olwage`);
    console.log(`   Role: Car Guard`);
    console.log(`   ID: 5508090077089`);
    console.log(`   Bank: Standard Bank`);
    console.log(`   Account: 281694893`);

    process.exit(0);
  } catch (error) {
    console.error("Error creating test worker:", error);
    process.exit(1);
  }
}

createTestWorker();
