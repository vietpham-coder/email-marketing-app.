import clientPromise from "./mongodb";

export interface Attachment {
  name: string;
  size: number;
  type: string;
  base64: string;
}

export interface EmailTemplate {
  id: string; // e.g. "tpl_12345678"
  name: string; // e.g. "Initial Outreach"
  subject: string;
  bodyHtml: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = "email_marketing";

export async function getTemplates(): Promise<EmailTemplate[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<EmailTemplate>("templates").find({}).sort({ updatedAt: -1 }).toArray();
}

export async function saveTemplate(template: EmailTemplate) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  await db.collection<EmailTemplate>("templates").updateOne(
    { id: template.id },
    { $set: template },
    { upsert: true }
  );
}

export async function deleteTemplate(id: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await db.collection("templates").deleteOne({ id });
}
