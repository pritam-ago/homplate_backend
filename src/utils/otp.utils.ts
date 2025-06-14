import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error('Missing Twilio credentials in environment variables');
}

const twilioClient = twilio(accountSid, authToken);

// Generate and send OTP using Twilio
export const generateOTP = async (phone: string): Promise<string> => {
    try {
        // Format phone number to E.164 format if not already
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        // Send verification code via Twilio
        await twilioClient.verify.v2
            .services(verifyServiceSid)
            .verifications.create({ to: formattedPhone, channel: 'sms' });

        // Generate a random OTP for our database (Twilio handles the actual OTP)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to database
        await prisma.oTP.create({
            data: {
                phone,
                otpCode: otp,
                expiresAt
            }
        });

        return otp;
    } catch (error: any) {
        console.error('Error generating OTP:', error);
        throw new Error('Failed to send OTP');
    }
};

// Verify OTP using Twilio
export const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
    try {
        // Format phone number to E.164 format if not already
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        // Verify the code with Twilio
        const verification = await twilioClient.verify.v2
            .services(verifyServiceSid)
            .verificationChecks.create({ to: formattedPhone, code: otp });

        return verification.status === 'approved';
    } catch (error: any) {
        console.error('Error verifying OTP:', error);
        throw new Error('Failed to verify OTP');
    }
};

// This function is no longer needed as Twilio handles the sending
export const sendOTP = async (phone: string, otp: string): Promise<void> => {
    // This function is kept for backward compatibility
    // The actual sending is handled by Twilio in generateOTP
    console.log(`OTP for ${phone}: ${otp}`);
}; 