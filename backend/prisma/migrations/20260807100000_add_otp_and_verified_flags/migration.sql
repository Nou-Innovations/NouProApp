-- Signup verification without Twilio (audit A-9), plus recording what was actually
-- verified (A-10).
--
-- Before this, the only OTP provider was Twilio Verify — and email OTP used the SAME
-- Verify service, so when Twilio was unconfigured all four OTP endpoints failed at once
-- and signup was impossible in every build profile. Codes can now also be delivered over
-- the existing SMTP transport (the one that sends password resets), or logged to the
-- console in development.
--
-- The code hash is stored server-side deliberately. A stateless JWT carrying the hash
-- would be readable by its holder, and a 6-digit code is brute-forceable offline in
-- milliseconds — which is exactly the attacker verifying a number they don't own.
-- `attempts` gives us the per-destination lockout Twilio used to provide.
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- Verification looks up the newest live code for a destination.
CREATE INDEX "OtpCode_destination_idx" ON "OtpCode"("destination");
-- Supports pruning expired rows.
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- Which contact details were actually proven. Existing accounts default to false:
-- they were created when verification was decorative, so claiming otherwise would be
-- a lie. Enforcement is gated behind REQUIRE_VERIFIED_SIGNUP.
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
