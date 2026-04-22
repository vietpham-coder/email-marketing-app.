import clientPromise from "./mongodb";

export interface Interaction {
  type: "initial" | "follow_up" | "weekly_nurture";
  sentAt: string;
  openedAt?: string;
  timeElapsedHours?: number;
}

export interface ContactData {
  [key: string]: any; // Allows dynamic excel columns
  email: string; // the primary key within a campaign
}

export interface CampaignRecord {
  id: string; // e.g. campaign-1234
  campaignName: string;
  audience: ContactData[];
  interactions: Record<string, Interaction[]>; // key is email
  createdAt: string;
}

const DB_NAME = "email_marketing";

function sanitizeKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeKeys);
  
  const newObj: any = {};
  for (let key in obj) {
    // Replace dots with underscores in keys for MongoDB compatibility
    const newKey = key.replace(/\./g, '_');
    newObj[newKey] = sanitizeKeys(obj[key]);
  }
  return newObj;
}

// ---------------- MASTER CONTACTS LOGIC ----------------

export async function getMasterContacts(): Promise<ContactData[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<ContactData>("master_contacts").find({}).toArray();
}

export async function saveMasterContacts(contacts: ContactData[]) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  // Clear and insert all (or we could use upsert logic)
  // To keep it simple and match previous behavior of overwriting:
  await db.collection("master_contacts").deleteMany({});
  if (contacts.length > 0) {
    const sanitized = sanitizeKeys(contacts);
    await db.collection("master_contacts").insertMany(sanitized);
  }
}

export async function upsertMasterContacts(newContacts: ContactData[]) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection("master_contacts");

  for (let contact of newContacts) {
    if (!contact.email) continue;
    const email = contact.email.toLowerCase();
    contact = sanitizeKeys(contact);
    // Remove _id if it exists to avoid MongoDB "immutable field _id" error during update
    const { _id, ...contactWithoutId } = contact;
    
    await collection.updateOne(
      { email: email },
      { $set: { ...contactWithoutId, email: email } },
      { upsert: true }
    );
  }
}

// ---------------- CAMPAIGN LOGIC ----------------

export async function saveCampaign(record: CampaignRecord) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  const sanitized = sanitizeKeys(record);
  
  await db.collection<CampaignRecord>("campaigns").updateOne(
    { id: record.id },
    { $set: sanitized },
    { upsert: true }
  );

  // Automatically upsert any new contacts from this campaign to Master
  await upsertMasterContacts(record.audience);
}

export async function deleteCampaign(id: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const result = await db.collection("campaigns").deleteOne({ id });
  return result.deletedCount > 0;
}

export async function getCampaigns(): Promise<CampaignRecord[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<CampaignRecord>("campaigns").find({}).sort({ createdAt: -1 }).toArray();
}

export async function markAsOpened(campaignId: string, email: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<CampaignRecord>("campaigns");

  // Email keys in interactions are sanitized (dots replaced with underscores)
  const sanitizedEmail = email.replace(/\./g, '_');

  const campaign = await collection.findOne({ id: campaignId });
  if (!campaign || !campaign.interactions[sanitizedEmail]) {
    console.log(`Tracking failed: Campaign ${campaignId} or email ${sanitizedEmail} not found`);
    return;
  }

  const interactions = [...campaign.interactions[sanitizedEmail]];
  let updated = false;

  // Find the last interaction that wasn't opened yet
  for (let i = interactions.length - 1; i >= 0; i--) {
    if (!interactions[i].openedAt) {
      const now = new Date();
      const sentTime = new Date(interactions[i].sentAt);
      interactions[i].openedAt = now.toISOString();
      const diffMs = now.getTime() - sentTime.getTime();
      interactions[i].timeElapsedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      updated = true;
      break; 
    }
  }

  if (updated) {
    await collection.updateOne(
      { id: campaignId },
      { $set: { [`interactions.${sanitizedEmail}`]: interactions } }
    );
    console.log(`Successfully updated open status for ${email} in campaign ${campaignId}`);
  }
}

// ---------------- MASTER DATABASE SYNC ----------------
// This function will now just be a helper to get the data for the Excel export
// Since we can't write to local file system on Vercel easily.

export async function getMasterReportData() {
  const allCampaigns = await getCampaigns();
  const allContacts = await getMasterContacts();
  const reportData: any[] = [];
  
  const interactionMap = new Map<string, { latestCampaign: string, interactions: Interaction[] }>();
  
  for (const campaign of allCampaigns) {
    for (const email of Object.keys(campaign.interactions)) {
      const interactions = campaign.interactions[email];
      if (!interactions || interactions.length === 0) continue;
      
      const key = email.toLowerCase();
      const existing = interactionMap.get(key);
      const currentLatestSentAt = new Date(interactions[interactions.length - 1].sentAt).getTime();
      
      if (!existing || currentLatestSentAt > new Date(existing.interactions[existing.interactions.length - 1].sentAt).getTime()) {
        interactionMap.set(key, { latestCampaign: campaign.campaignName, interactions });
      }
    }
  }

  for (const contact of allContacts) {
    if (!contact.email) continue;
    // We must sanitize the lookup key because MongoDB interaction keys are sanitized (dots -> underscores)
    const key = contact.email.toLowerCase().replace(/\./g, '_');
    const interactionHistory = interactionMap.get(key);
    
    let sentDateStr = "N/A";
    let readStatusStr = "No";
    let timeElapsedStr = "N/A";
    let nextStepStr = "N/A";
    let campaignName = "No active campaign";
    
    if (interactionHistory && interactionHistory.interactions.length > 0) {
      const interactions = interactionHistory.interactions;
      campaignName = interactionHistory.latestCampaign;
      const latestInteraction = interactions[interactions.length - 1];
      sentDateStr = new Date(latestInteraction.sentAt).toLocaleString();
      
      if (latestInteraction.openedAt) {
        readStatusStr = "Yes";
        timeElapsedStr = `${latestInteraction.timeElapsedHours || 0} hours`;
        nextStepStr = "🟢 Nhắc nhở gửi Email chăm sóc hàng tuần";
      } else {
        const daysSinceSent = (new Date().getTime() - new Date(latestInteraction.sentAt).getTime()) / (1000 * 3600 * 24);
        const hasFollowUp = interactions.length > 1;
        if (daysSinceSent >= 7) nextStepStr = "📞 Yêu cầu gọi điện trực tiếp";
        else if (daysSinceSent >= 5 && hasFollowUp) nextStepStr = "🔴 Yêu cầu nhắn tin qua Linkedin hoặc Whatsapp";
        else if (daysSinceSent >= 3 && !hasFollowUp) nextStepStr = "🟡 Gửi Email Follow Up";
        else nextStepStr = "Đang chờ mở...";
      }
    }

    reportData.push({
      ...contact,
      "Latest Campaign": campaignName,
      "Lần cuối gửi": sentDateStr,
      "Trạng thái đã đọc": readStatusStr,
      "Thời gian chờ mở": timeElapsedStr,
      "Đề xuất bước tiếp theo": nextStepStr
    });
  }

  return reportData;
}
