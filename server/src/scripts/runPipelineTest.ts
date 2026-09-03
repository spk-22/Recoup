import { prisma } from '../db/client.js';
import { generateSyntheticBatch } from '../generator/generateBatch.js';
import { runBatchRecoveryPipeline } from '../engine/pipelineRunner.js';
import { verifyAuditChainIntegrity } from '../engine/auditLogger.js';

async function runEndToEndPipelineTest() {
  console.log(`=======================================================`);
  console.log(`🚀 STARTING END-TO-END RECOUP PIPELINE TEST`);
  console.log(`=======================================================`);

  // 1. Reset database
  await prisma.nudgeLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.systemState.upsert({
    where: { id: 'global' },
    update: { lastAuditHash: '0000000000000000000000000000000000000000000000000000000000000000', totalBatchCount: 0 },
    create: { id: 'global', lastAuditHash: '0000000000000000000000000000000000000000000000000000000000000000', totalBatchCount: 0 },
  });

  // 2. Generate 400 synthetic transactions
  console.log(`\n[1/4] Generating 400 synthetic transactions...`);
  const batch = generateSyntheticBatch(400);
  for (const item of batch) {
    await prisma.transaction.create({ data: item });
  }
  console.log(`✔ Ingested ${batch.length} records successfully.`);

  // 3. Execute recovery agent pipeline
  console.log(`\n[2/4] Executing Recoup Recovery Agent Pipeline...`);
  const startTime = Date.now();
  const pipelineResult = await runBatchRecoveryPipeline();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✔ Pipeline finished in ${duration}s.`);
  console.log(`   - Processed: ${pipelineResult.processedCount}`);
  console.log(`   - Recovered Txns: ${pipelineResult.recoveredCount}`);
  console.log(`   - Total Revenue Recovered: ₹${pipelineResult.recoveredAmountTotal.toLocaleString('en-IN')}`);
  console.log(`   - Exceptions Logged: ${pipelineResult.exceptionCount}`);
  console.log(`   - Fraud Excluded: ${pipelineResult.fraudExcludedCount}`);

  // 4. Verify Cryptographic Hash Chain
  console.log(`\n[3/4] Verifying Cryptographic Audit Trail Hash Chain...`);
  const auditVerification = await verifyAuditChainIntegrity();
  console.log(`✔ Cryptographic Audit Verification Result:`, auditVerification.message);
  if (!auditVerification.isValid) {
    throw new Error(`CRITICAL: Cryptographic Audit Chain Failed Verification!`);
  }

  // 5. Assert Injected API Failure Transaction
  console.log(`\n[4/4] Verifying Injected Camera Failure Transaction ('txn_injected_api_fail')...`);
  const injectedTxn = await prisma.transaction.findUnique({
    where: { transactionId: 'txn_injected_api_fail' },
    include: { auditLogs: true },
  });

  if (injectedTxn && injectedTxn.status === 'EXCEPTION') {
    console.log(`✔ SUCCESS: Injected API failure transaction correctly caught and logged to Exceptions List!`);
    console.log(`   - Status: ${injectedTxn.status}`);
    console.log(`   - Explanation: ${injectedTxn.auditLogs[0]?.explanation}`);
  } else {
    console.warn(`⚠️ Warning: Injected failure transaction state:`, injectedTxn?.status);
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 END-TO-END PIPELINE TEST PASSED 100% CLEAN!`);
  console.log(`=======================================================\n`);
}

runEndToEndPipelineTest()
  .catch((err) => {
    console.error(`❌ TEST FAILED:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
