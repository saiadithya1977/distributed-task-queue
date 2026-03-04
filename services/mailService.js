import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure:false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});


export async function sendWelcomeEmail(user) {
  console.log("Preparing email for:", user.email);

  // simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`Email sent successfully to ${user.email}`);

  return true;
}