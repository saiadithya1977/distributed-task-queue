import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure:false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});


export async function sendWelcomeEmail(user) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: "Welcome to the Queue System ",
    html: `
      <h2>Hello ${user.username}</h2>
      <p>Your account was successfully registered.</p>
      <p>This email was sent asynchronously by a background worker.</p>
      <br/>
      <b>Job Processing System Demo</b>
    `,
  });

  console.log("Email delivered:", info.messageId);
  return true;
}