// Demo packs: realistic solved tickets, KB articles and SOPs for three kinds of service desk.
// Written by a separate agent for the blind test (validation/sim worlds dev01, dev02, t03). All people and companies are fictional.
// A lead can build a practice track from a pack on a fresh site, before importing real tickets.
export const PACKS = [
 {
  "id": "it",
  "title": "IT service desk (Brightwater Logistics)",
  "context": "Brightwater Logistics is a 1,800-person freight forwarding and warehousing company with offices in Rotterdam,\nAntwerp and Leeds plus a large remote and travelling sales force. The internal IT Service Desk (Jira Service\nManagement project ITSD) supports Dell Latitude laptops running Windows 11, GlobalProtect VPN, Okta sign-in with\nOkta Verify MFA, Microsoft 365 and Intune-managed devices. Level 1 agents handle contact, triage and standard\nfixes; the Identity, Endpoint, NetOps, Security and Licensing teams own anything beyond the desk's permissions.",
  "kb": [
   {
    "id": "KB-1",
    "title": "GlobalProtect VPN: 'Gateway not responding' or cannot connect",
    "body": "Applies to Windows laptops running GlobalProtect 6.x.\n\nBefore changing anything, establish three things with the user:\n1. The network type: home broadband, mobile hotspot, hotel or conference wifi, or a customer site.\n2. Whether the user can load a public website in a browser. If no site loads, a captive portal sign-in page or the network itself is the problem, not the VPN.\n3. The GlobalProtect version, shown under Settings > About.\n\nVersions below 6.1 must be upgraded from Company Portal before any further troubleshooting. Versions 6.1 and above must not be reinstalled as a first step; reinstalling does not fix network-path problems and wastes the user's time.\n\nIf the network is hotel, conference or guest wifi and the browser works, the most likely cause is that the network blocks the IPSec transport. Ask the user to open GlobalProtect > Settings > Gateway and choose Brightwater-TCP, which runs an SSL tunnel over TCP 443. Warn the user that throughput is lower on this gateway and large file sync may be\nslow.\n\nIf the network is home broadband and the browser works, ask the user to restart the router and, to isolate the network, try a mobile hotspot. If the user reaches the portal but authentication fails, go to KB-2 (account) or\nKB-3 (MFA).\n\nEscalate to NetOps only when three or more users report the same gateway failing within one hour (SOP-4)."
   },
   {
    "id": "KB-2",
    "title": "Account lockout and password reset",
    "body": "Brightwater accounts lock after 10 failed sign-in attempts within 15 minutes and unlock automatically after 30 minutes. Users can reset their own password in the self-service password portal from any browser if they are enrolled in Okta Verify.\n\nA desk agent may unlock an account or set a temporary password only after completing identity verification under SOP-1. Explain to the user why the callback is needed; do not unlock first and verify later.\n\nAfter a password change, the most common cause of repeated lockouts is a device that still uses the old password. Typical culprits are phone mail apps (Outlook, Gmail, Apple Mail) set up with work mail, tablets, an old laptop, mapped network drives and saved BW-Corp wifi profiles. Ask the user which other devices access work mail or the corporate wifi. After unlocking, ask the user to update the password on those devices or remove the work account from them, otherwise the account will lock again within minutes.\n\nThe admin tools show which domain controller and which client caused the lockout. Use this to guide your questions, but do not quote hostnames, client names or attempt counts to the user (SOP-2). Describe the cause in plain words, for example \"a device that still has your old password\".\n\nIf an account locks three times in 24 hours and no device is found, escalate to the Identity team."
   },
   {
    "id": "KB-3",
    "title": "Replacing an MFA device (Okta Verify)",
    "body": "Use this article when a user has a new phone or has lost access to the phone that holds Okta Verify.\n\nFirst ask whether the old phone is still available and working. If it is, the user can move MFA themselves: sign in to Okta, open Settings > Security Methods > Set up another, enroll the new phone, then remove the old one. No desk action is needed.\n\nIf the old phone is gone (lost, stolen, wiped or traded in), the desk must reset the Okta Verify factor:\n1. Complete identity verification under SOP-1 first. For MFA resets the preferred method is a video call in which the user shows their Brightwater badge; a callback to the Workday number is also acceptable.\n2. Record the verification in an internal note, then reset the factor in the Okta admin console.\n3. Give the user a 60-minute temporary code by phone only, never in chat or email (SOP-2).\n4. Guide the user through enrolling Okta Verify on the new phone and confirm a push works.\n\nAsk about urgency. Users who are about to travel must finish enrollment before departure, because enrollment needs a working data connection and the temporary code expires.\n\nIf the phone was lost or stolen, also ask the user to report it to Security through the Lost Device form. Never reset a factor because a manager or colleague asks on the user's behalf."
   },
   {
    "id": "KB-4",
    "title": "BitLocker recovery screen at startup",
    "body": "A BitLocker recovery screen appears when the laptop's TPM detects a change in the boot chain. Common triggers are BIOS or firmware updates, TPM resets, hardware repairs and, occasionally, changes to docking hardware.\n\nCollect the following from the user:\n- The device name or asset tag (sticker on the base, format BW-LT-nnnnn).\n- The Key ID shown on the recovery screen. The first 8 characters are enough to match.\n- What changed recently: updates, restarts during an update, repairs, a new dock.\n\nBrightwater does not enable self-service recovery key retrieval. Keys are escrowed in Intune and released only by the desk. After identity verification under SOP-1, look up the key by device name and confirm that the Key ID on the user's screen matches the stored Key ID. Then read the 48-digit recovery key aloud during the call.\n\nNever send a recovery key by email, chat or in a ticket comment, even to the user (SOP-2). If the Key ID does not match any stored key, do not read out any key; escalate to the Endpoint team.\n\nAfter the user is back in, if the trigger was a firmware or BIOS update, link the ticket to the open problem record for that update (internal only) and tell the user in plain language that the update caused a one-time prompt. If the prompt returns at every boot, escalate to Endpoint."
   },
   {
    "id": "KB-5",
    "title": "Laptop not charging or battery faults",
    "body": "Ask the user three things first:\n1. Which power adapter they are using: a Dell-branded USB-C adapter (65 W or 90 W) or a third-party charger.\n2. The asset tag on the base of the laptop (BW-LT-nnnnn).\n3. Which site they work from, so a loaner can be arranged if needed.\n\nThird-party chargers are not supported. Many do not negotiate the power profile Latitude laptops expect and will charge slowly, intermittently or not at all. Before diagnosing the laptop, have the user test with a Dell adapter. Spare adapters are kept in the IT lockers at Rotterdam, Antwerp and Leeds DC; remote users can borrow one from a colleague or request one by courier.\n\nIf a Dell adapter does not help, ask the user to restart, press F2 at the Dell logo and open Battery Information. If Battery Health reads \"Replace\", or no battery is detected, raise a depot RMA for the battery under SOP-3 and offer a loaner if the user cannot work plugged in.\n\nUsers must not open the laptop. If the battery is swollen (the base bulges, the touchpad lifts or the lid no longer closes flat), tell the user to stop using and charging it immediately and place it on a hard surface, and raise the RMA as urgent."
   },
   {
    "id": "KB-6",
    "title": "Outlook shows 'Need Password' or 'Disconnected'",
    "body": "Symptoms: Outlook for Windows repeatedly shows a \"Need Password\" banner, the status bar says Disconnected, or a sign-in window appears every few minutes.\n\nAsk the user:\n1. The Outlook version and build (File > Office Account > About Outlook).\n2. Whether webmail in a browser works.\n3. Whether they changed their password recently.\n\nBuilds older than Version 2402 must be updated through Company Portal first.\n\nIf webmail works and the password changed recently, the cause is almost always a stale cached credential. Ask the user to close Outlook, open Credential Manager > Windows Credentials, remove every entry that begins with MicrosoftOffice16, then reopen Outlook and sign in once. This is the first fix to try.\n\nIf prompts continue after clearing credentials, create a new Outlook profile (Control Panel > Mail > Show Profiles > Add) and set it as default. Do not delete the old profile until mail has fully synced in the new one.\n\nIf webmail also fails, treat it as an account problem and follow KB-2.\n\nAgents can see sign-in log results in the admin portal. Use them to confirm the cause, but describe it to the user in plain language; do not paste error codes from admin tools into replies (SOP-2)."
   },
   {
    "id": "KB-7",
    "title": "Shared mailbox and distribution list access",
    "body": "Every shared mailbox and distribution list has an owner recorded in the directory. Access is granted only with the owner's approval. The requester's own manager cannot approve access to a mailbox they do not own, and the desk must not grant access on the strength of the request alone.\n\nCollect from the user:\n- The full address of the mailbox or list.\n- The access level needed: Full Access (read and manage items), Send As (reply as the mailbox) or Send on Behalf (reply showing \"on behalf of\"). Users often need Full Access plus one send right.\n- The business reason, in one line, for the owner.\n\nRaise an approval request to the owner from the ticket. Grant access only once the approval is recorded on the ticket. Changes take up to 60 minutes to appear; ask the user to restart Outlook afterwards. The mailbox appears in the folder pane automatically for Full Access.\n\nDo not tell users who else has access to a mailbox. If the user asks who the owner is so they can chase the approval, it is fine to say that the request is with the mailbox owner; let the owner contact the user directly.\n\nFor distribution lists, membership changes for lists with more than 500 members go to the Messaging team."
   },
   {
    "id": "KB-8",
    "title": "New starter account not active on day one",
    "body": "New starter accounts are created from Workday by the nightly HR sync, which runs at 02:00, and are enabled on the effective start date recorded in Workday. Laptops are pre-built and handed out by site IT.\n\nThe desk cannot enable an account directly. Common causes of a disabled account on day one:\n- The start date was moved earlier in Workday after the account was created. The account stays disabled until HR corrects the effective date and the Identity team runs a manual sync.\n- The hire was not marked as complete in Workday.\n\nAsk the hiring manager (or the new starter):\n1. The new starter's employee number.\n2. Whether the start date changed at any point.\n3. The exact message shown on screen.\n\nRaise a request to the Identity team with these details, and ask the HR partner to correct the record if needed. Give the hiring manager a next-update time under SOP-4; do not promise when the account will work.\n\nOnce the account is enabled, the first temporary password is given to the hiring manager by calling back the manager's number in Workday (SOP-1). The new starter then sets a password and enrolls Okta Verify at first sign-in. Suggest the manager line up shadowing or reading material while waiting."
   },
   {
    "id": "KB-9",
    "title": "Docking stations and external monitors",
    "body": "Supported docks are the Dell WD19S and WD22TB4. When a monitor stays blank or shows \"no signal\" on a dock, ask:\n1. The laptop model.\n2. How each monitor is connected: which dock port, which cable, and whether any monitor is daisy-chained through another monitor's DisplayPort out.\n3. Whether the monitor works when plugged directly into the laptop.\n\nIf the monitor works directly but not through the dock, the dock or its configuration is the issue.\n\nLatitude 7330 and 7340 laptops support two external displays through a WD19S only when each monitor is connected to its own dock video port, unless the dock firmware is 01.00.36 or newer, which restores daisy-chain support. Ask the user to keep the laptop connected to the dock and to AC power, open Dell Command Update, install all dock firmware updates and restart. Then connect each monitor to its own dock port (HDMI and DisplayPort, or two\nDisplayPort).\n\nIf the issue remains after the firmware update and recabling, swap the cable for a known good one. If it still fails, raise a depot RMA for the dock under SOP-3. Do not ask users to update monitor firmware."
   },
   {
    "id": "KB-10",
    "title": "Software installation and local admin rights",
    "body": "Standard users do not have local administrator rights on Brightwater laptops. The desk cannot grant administrator rights, either permanently or temporarily, and must not offer to.\n\nApproved software is self-service through Company Portal. For software that is not in Company Portal, the user submits a Software Request with a business reason and a cost center; Licensing reviews requests within five business\ndays.\n\nSome tools are restricted and cannot be installed through a Software Request at all: packet capture tools, remote access tools, password recovery tools and unapproved browsers. These need a Security exception, which the user's director must sponsor. In most cases the better route is to have the owning team do the work. For example, NetOps can run wireless and network captures, and Endpoint can collect device diagnostics.\n\nAlways ask the user what problem they are trying to solve. The stated request (for example \"I need admin\") is often a means to an end that the desk or another team can deliver faster.\n\nWhen routing work to another team, give the user a next-update time under SOP-4."
   }
  ],
  "sop": [
   {
    "id": "SOP-1",
    "title": "Identity verification",
    "body": "Before any of these actions, the agent must verify the user's identity: password reset or temporary password, account unlock, MFA factor reset or temporary MFA code, BitLocker recovery key disclosure, and handover of a new\nstarter's first password. Accepted methods: (a) calling the user back on the phone number held in Workday, or (b) a live video call in which the user shows their Brightwater badge. Employee ID, manager name, knowledge of personal details, or a message from the user's mailbox or chat account are NOT sufficient on their own. Record the method and time in an internal note before completing the action. If verification is not possible, do not perform the action; explain why and offer the next step."
   },
   {
    "id": "SOP-2",
    "title": "Data handling and confidentiality",
    "body": "Never share with users: internal hostnames or server names; details from admin consoles and logs (lockout sources, attempt counts, sign-in log error codes, sync job output); the contents of internal notes; internal problem, change or approval record IDs; and other users' details beyond what the request needs. Describe causes in plain language. Never ask a user for their password. Never send secrets (recovery keys, temporary passwords or codes) in writing; give them by phone only."
   },
   {
    "id": "SOP-3",
    "title": "Hardware replacement and loaners",
    "body": "Replacement devices and parts are supplied only by the hardware depot through an RMA. Replacements are like for like: agents must not promise upgraded models, new devices instead of repairs, or specific delivery dates beyond the standard ones. Loaners: collected from the site IT locker within 1 business day; remote users receive one by courier in 2-3 business days. Never promise same-day delivery."
   },
   {
    "id": "SOP-4",
    "title": "Escalation and commitments",
    "body": "When a fix depends on another team (Identity, Endpoint, NetOps, Security, Licensing), do not promise a resolution time. Give the user a \"next update by\" time no more than 4 business hours away and keep it. Desk agents cannot grant exceptions to KB rules (admin rights, restricted software, access without owner approval). Raise a P1 to NetOps when three or more users report the same outage within one hour."
   },
   {
    "id": "SOP-5",
    "title": "Communication standards",
    "body": "Use plain language and acknowledge the impact on the user's work. No blame, sarcasm or judgement about what the user did. Do not make the user repeat information they have already given in the ticket. End each reply with one clear next step and sign with your first name."
   }
  ],
  "tickets": [
   {
    "key": "ITSD-4102",
    "request_type": "VPN / Remote access",
    "summary": "VPN won't connect from hotel - client call at 3",
    "created": "2026-10-06T11:02:00Z",
    "customer": {
     "name": "Priya Raman",
     "role": "Senior Account Manager"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Priya Raman",
      "date": "2026-10-06T11:02:00Z",
      "public": true,
      "body": "Hi, VPN isn't working on my Latitude 7440. GlobalProtect just says \"Gateway not responding\" and spins. I have a client call at 3pm and I need the rate cards on SharePoint. Please help!!"
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-06T11:11:00Z",
      "public": true,
      "body": "Hi Priya, sorry about this, let's get you connected before your call. Three quick questions:\n1. What network are you on right now (home, hotel, hotspot...)?\n2. Can you open a normal website in your browser?\n3. Which GlobalProtect version do you have? It's under Settings > About.\nThanks, Marta"
     },
     {
      "from": "customer",
      "author": "Priya Raman",
      "date": "2026-10-06T11:17:00Z",
      "public": true,
      "body": "I'm at the Hotel Lindenhof in Munich on their guest wifi. Browser is fine, I can read the news. Version says 6.1.3."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-06T11:23:00Z",
      "public": false,
      "body": "gp-portal-eu-01 shows the user authenticating OK, then the IPSec tunnel times out. Hotel guest networks often drop UDP 4501. Moving the user to the TCP gateway per KB-1."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-06T11:25:00Z",
      "public": true,
      "body": "Thanks Priya. Some hotel networks block the type of connection the VPN normally uses. Please open GlobalProtect > Settings > Gateway, choose Brightwater-TCP and click Connect. It can be a little slower, but it works on most hotel wifi. Let me know what happens. Marta"
     },
     {
      "from": "customer",
      "author": "Priya Raman",
      "date": "2026-10-06T11:32:00Z",
      "public": true,
      "body": "Connected!! Thank you. It's a bit slow opening files but I have what I need."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-06T11:35:00Z",
      "public": true,
      "body": "Great to hear. The slower speed is normal on that gateway; once you're back on home or office wifi you can switch back to automatic. I'll close this ticket, just reply if it drops again. Good luck with the call! Marta"
     }
    ],
    "resolution": "Hotel guest wifi blocked UDP 4501 (IPSec). User switched GlobalProtect to the Brightwater-TCP SSL gateway and connected.",
    "kb_used": [
     "KB-1"
    ]
   },
   {
    "key": "ITSD-4117",
    "request_type": "Account / Password",
    "summary": "Locked out of laptop after password change",
    "created": "2026-10-08T08:14:00Z",
    "customer": {
     "name": "Daniel Hoekstra",
     "role": "Customs Clearance Officer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Daniel Hoekstra",
      "date": "2026-10-08T08:14:00Z",
      "public": true,
      "body": "Morning. Windows says \"The referenced account is currently locked out and may not be logged on to\". I changed my password yesterday afternoon when it expired. Can you unlock it please, I have declarations to file by 10."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-08T08:20:00Z",
      "public": true,
      "body": "Hi Daniel, I can help with that. Before I can unlock an account I have to verify it's you, so I'll call you back on the mobile number in Workday in a moment. While I set that up: do you use work email or the BW-Corp wifi on any other device, like a phone or tablet? A device with your old password is the usual reason for a lockout right after\na change. Dev"
     },
     {
      "from": "customer",
      "author": "Daniel Hoekstra",
      "date": "2026-10-08T08:23:00Z",
      "public": true,
      "body": "Sure, call me. Yes, my Pixel 7 has work email set up in the Gmail app. Didn't think of that."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-08T08:30:00Z",
      "public": false,
      "body": "Callback to Workday mobile 08:29, identity verified. Lockout source dc-ams-03, client ActiveSync, 47 bad attempts since 17:40 yesterday. That's the phone. Unlocked."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-08T08:32:00Z",
      "public": true,
      "body": "Thanks for taking my call, Daniel. Your account is unlocked. Before you sign in, please open the Gmail app on your Pixel, go to the work account and update the password (or remove the account and add it back). Otherwise it'll lock you out again within a few minutes. Dev"
     },
     {
      "from": "customer",
      "author": "Daniel Hoekstra",
      "date": "2026-10-08T08:40:00Z",
      "public": true,
      "body": "Done on the phone, signed into the laptop and it's staying unlocked. Thanks!"
     }
    ],
    "resolution": "Phone Gmail app (ActiveSync) still had the old password and caused 47 bad attempts against dc-ams-03. Unlocked after callback verification; user updated the phone.",
    "kb_used": [
     "KB-2"
    ]
   },
   {
    "key": "ITSD-4125",
    "request_type": "MFA / Okta",
    "summary": "New phone - need Okta Verify moved",
    "created": "2026-10-12T13:40:00Z",
    "customer": {
     "name": "Lena Vogt",
     "role": "Regional Sales Director"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Lena Vogt",
      "date": "2026-10-12T13:40:00Z",
      "public": true,
      "body": "Hi team, I've got a new iPhone 15 and need to move Okta Verify onto it. The old phone is gone. What do I do?"
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-12T13:47:00Z",
      "public": true,
      "body": "Hi Lena, happy to help. Do you still have the old phone with you, even switched off? If yes, you can move Okta Verify yourself in a couple of minutes. And is there a deadline, e.g. upcoming travel? Marta"
     },
     {
      "from": "customer",
      "author": "Lena Vogt",
      "date": "2026-10-12T13:52:00Z",
      "public": true,
      "body": "No, I traded it in at the Vodafone store yesterday, they wiped it. And yes, I fly to Singapore on Thursday (SQ327) and I can't be locked out over there."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-12T13:55:00Z",
      "public": true,
      "body": "Understood, we'll get this done well before Thursday. Because the old phone is gone I need to reset your MFA, and for that I have to verify your identity first. Could you join a quick Teams video call now and hold up your Brightwater badge? It takes two minutes. Marta"
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-12T14:11:00Z",
      "public": false,
      "body": "Video call 14:09, badge shown and matches HR photo. Identity verified per SOP-1. Okta Verify factor reset, ref FR-88213. Gave a 60-minute temporary code by phone."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-12T14:13:00Z",
      "public": true,
      "body": "Thanks Lena. I've reset your old Okta Verify enrolment. Use the temporary code I just read to you to sign in at the Okta page, then follow the prompt to set up Okta Verify on the iPhone 15. Let me know once a test push works. Marta"
     },
     {
      "from": "customer",
      "author": "Lena Vogt",
      "date": "2026-10-12T14:24:00Z",
      "public": true,
      "body": "All set, push notifications arrive on the new phone. Thanks for the quick turnaround!"
     }
    ],
    "resolution": "Old phone traded in; identity verified by badge video call, Okta Verify factor reset (FR-88213), 60-minute temporary code given by phone, user re-enrolled on iPhone 15.",
    "kb_used": [
     "KB-3"
    ]
   },
   {
    "key": "ITSD-4133",
    "request_type": "Laptop / Hardware",
    "summary": "Laptop stuck on BitLocker recovery screen",
    "created": "2026-10-14T07:31:00Z",
    "customer": {
     "name": "Tomas Lindqvist",
     "role": "Warehouse Operations Planner"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Tomas Lindqvist",
      "date": "2026-10-14T07:31:00Z",
      "public": true,
      "body": "My laptop BW-LT-06618 shows a blue BitLocker recovery screen asking for a recovery key. No idea what that is or where to get it. I'm presenting the weekly plan at 11."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-14T07:36:00Z",
      "public": true,
      "body": "Hi Tomas, no worries, this is fixable. I'll call you on the number we have in Workday to verify your identity, then read you the key over the phone. To find the right key, please tell me the Key ID shown on the screen (the first 8 characters are enough), and whether anything changed on the laptop recently, like updates or a restart overnight. Dev"
     },
     {
      "from": "customer",
      "author": "Tomas Lindqvist",
      "date": "2026-10-14T07:42:00Z",
      "public": true,
      "body": "Key ID starts 4F2A91C3. Last night a Dell Command Update window said it was installing something and then it restarted. You can call my mobile, I'm at my desk."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-14T07:51:00Z",
      "public": false,
      "body": "Callback to Workday mobile 07:51, verified. Intune key for BW-LT-06618 matches Key ID. Known issue PRB-2291: BIOS 1.18.0 pushed via DCU triggers recovery on 5430/7440 when TPM measurements change. Read key by phone."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-14T07:53:00Z",
      "public": true,
      "body": "Thanks for taking the call, Tomas. Once you've entered the key it should boot normally. Let me know if it does. Dev"
     },
     {
      "from": "customer",
      "author": "Tomas Lindqvist",
      "date": "2026-10-14T08:00:00Z",
      "public": true,
      "body": "It's booting. Phew. Will this happen again?"
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-14T08:03:00Z",
      "public": true,
      "body": "Glad you're in. Last night's BIOS update caused a one-time prompt; it shouldn't come back. If it asks for the key again at the next restart, reply here and we'll take it further. Good luck at 11! Dev"
     }
    ],
    "resolution": "BIOS 1.18.0 update via Dell Command Update triggered BitLocker recovery (PRB-2291). Callback verification, key read by phone, ticket linked to problem record.",
    "kb_used": [
     "KB-4"
    ]
   },
   {
    "key": "ITSD-4140",
    "request_type": "Laptop / Hardware",
    "summary": "Laptop won't charge",
    "created": "2026-10-15T09:05:00Z",
    "customer": {
     "name": "Ahmed Bensaid",
     "role": "Inventory Controller"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Ahmed Bensaid",
      "date": "2026-10-15T09:05:00Z",
      "public": true,
      "body": "My Latitude 5430 won't charge. Battery is at 0% and the light on the charger plug doesn't come on. It only runs\nplugged in sometimes."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-15T09:13:00Z",
      "public": true,
      "body": "Hi Ahmed, let's sort it. Could you tell me:\n1. Which charger are you using: the Dell one that came with the laptop, or another brand?\n2. The asset tag on the bottom of the laptop (starts BW-LT)?\n3. Which site you work from, in case we need to get you a loaner?\nMarta"
     },
     {
      "from": "customer",
      "author": "Ahmed Bensaid",
      "date": "2026-10-15T09:25:00Z",
      "public": true,
      "body": "It's an Anker 65W I bought, the Dell one broke months ago. Asset tag BW-LT-05127. I'm at the Leeds DC."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-15T09:31:00Z",
      "public": true,
      "body": "Thanks. Non-Dell chargers often don't work properly with these laptops. There are spare Dell adapters in the IT locker at Leeds DC; could you try one? If it still won't charge, restart and press F2 at the Dell logo, open Battery Information and tell me what Battery Health says. Marta"
     },
     {
      "from": "customer",
      "author": "Ahmed Bensaid",
      "date": "2026-10-15T10:03:00Z",
      "public": true,
      "body": "Tried a Dell adapter from the locker, still nothing. The BIOS screen says Battery Health: Replace."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-15T10:09:00Z",
      "public": false,
      "body": "Depot battery RMA-77310 raised against BW-LT-05127. Loaner LN-0442 reserved at Leeds DC locker for tomorrow."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-15T10:11:00Z",
      "public": true,
      "body": "Thanks for checking, Ahmed. The battery needs replacing, so I've ordered one through our hardware depot. In the meantime a loaner laptop will be ready for you at the Leeds DC IT locker tomorrow. The site technician will contact you to fit the new battery when it arrives. Marta"
     },
     {
      "from": "customer",
      "author": "Ahmed Bensaid",
      "date": "2026-10-15T10:15:00Z",
      "public": true,
      "body": "OK cheers."
     }
    ],
    "resolution": "Third-party charger ruled out; BIOS showed battery health Replace. Battery RMA-77310 via depot and loaner LN-0442 at Leeds DC.",
    "kb_used": [
     "KB-5"
    ]
   },
   {
    "key": "ITSD-4148",
    "request_type": "Email / Outlook",
    "summary": "Outlook keeps asking for password",
    "created": "2026-10-19T10:22:00Z",
    "customer": {
     "name": "Grace Mensah",
     "role": "Finance Analyst"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Grace Mensah",
      "date": "2026-10-19T10:22:00Z",
      "public": true,
      "body": "Outlook keeps popping up \"Need Password\" and the bottom bar says Disconnected. I type my password, it goes away for ten minutes and comes back. It's driving me mad."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-19T10:29:00Z",
      "public": true,
      "body": "Hi Grace, sorry, that is annoying. A few checks so I fix the right thing:\n1. Which Outlook version are you on? File > Office Account > About Outlook shows it.\n2. Does webmail in your browser work?\n3. Did you change your password recently?\nDev"
     },
     {
      "from": "customer",
      "author": "Grace Mensah",
      "date": "2026-10-19T10:37:00Z",
      "public": true,
      "body": "Version 2408 (Build 17928.20114). Webmail works fine. I changed my password last Monday when it expired."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-19T10:42:00Z",
      "public": false,
      "body": "Sign-in logs: AADSTS50173 on the user's Outlook client, token from before the password change. Stale cached credential."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-10-19T10:44:00Z",
      "public": true,
      "body": "Thanks Grace. It looks like Outlook is holding on to your old sign-in. Please close Outlook, open Credential Manager from the Start menu > Windows Credentials, remove every entry that starts with MicrosoftOffice16, then open Outlook and sign in once. Dev"
     },
     {
      "from": "customer",
      "author": "Grace Mensah",
      "date": "2026-10-19T10:57:00Z",
      "public": true,
      "body": "That did it, no more pop-ups for half an hour now. Thank you!"
     }
    ],
    "resolution": "Stale cached credential after password change (AADSTS50173). Cleared MicrosoftOffice16 entries in Credential Manager.",
    "kb_used": [
     "KB-6"
    ]
   },
   {
    "key": "ITSD-4152",
    "request_type": "Access request",
    "summary": "Access to freight claims shared mailbox",
    "created": "2026-10-21T12:10:00Z",
    "customer": {
     "name": "Jonas Peeters",
     "role": "Claims Handler"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Jonas Peeters",
      "date": "2026-10-21T12:10:00Z",
      "public": true,
      "body": "Hi, I just moved into the claims team and need access to the freight-claims@brightwater-logistics.com mailbox please."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-21T12:16:00Z",
      "public": true,
      "body": "Hi Jonas, welcome to claims! Access to shared mailboxes needs approval from the mailbox owner. To put the request together: what do you need to do in the mailbox, just read it, or also reply as freight-claims? And who is your\nmanager? Marta"
     },
     {
      "from": "customer",
      "author": "Jonas Peeters",
      "date": "2026-10-21T12:24:00Z",
      "public": true,
      "body": "I need to reply to customers from it, so Send As I guess, plus reading obviously. My manager is Joanne Reyes."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-21T12:28:00Z",
      "public": false,
      "body": "Owner per directory: Callum Price. Approval request APR-5531 sent for Full Access + Send As."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-21T12:30:00Z",
      "public": true,
      "body": "Thanks. I've sent the request to the mailbox owner for Full Access and Send As. Once it's approved the mailbox will appear in Outlook within about an hour. I'll update you when it's through. Marta"
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-21T16:00:00Z",
      "public": false,
      "body": "APR-5531 approved by owner 16:02. Granted Full Access + Send As."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-21T16:02:00Z",
      "public": true,
      "body": "Good news, the access is approved and set up. Restart Outlook and freight-claims will appear in your folder list (it can take up to 60 minutes). To send as the mailbox, pick it in the From field. Marta"
     },
     {
      "from": "customer",
      "author": "Jonas Peeters",
      "date": "2026-10-21T17:10:00Z",
      "public": true,
      "body": "It's showing now, and I can send from it. Thanks."
     }
    ],
    "resolution": "Owner approval APR-5531 obtained from Callum Price; Full Access + Send As granted.",
    "kb_used": [
     "KB-7"
    ]
   },
   {
    "key": "ITSD-4160",
    "request_type": "Account / Password",
    "summary": "New starter can't log in on first day",
    "created": "2026-11-11T08:05:00Z",
    "customer": {
     "name": "Rachel Adeyemi",
     "role": "Transport Planning Manager"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Rachel Adeyemi",
      "date": "2026-11-11T08:05:00Z",
      "public": true,
      "body": "My new hire Tomasz Wierzbicki started today and can't log in. The laptop says \"Your account has been disabled. Please see your system administrator.\" Tomasz is sitting next to me doing nothing. Please fix ASAP."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-11T08:11:00Z",
      "public": true,
      "body": "Hi Rachel, sorry for the rough start for Tomasz. To find out what's happened: what's Tomasz's employee number, and did the start date change at any point? Dev"
     },
     {
      "from": "customer",
      "author": "Rachel Adeyemi",
      "date": "2026-11-11T08:16:00Z",
      "public": true,
      "body": "Employee number BW-31877. And yes, HR moved the start from 18 November to today because a slot opened up."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-11T08:23:00Z",
      "public": false,
      "body": "ldap-sync-02 log: record for BW-31877 skipped, Workday effective date 2026-11-18 still in the future. Asked HR partner to correct the effective date; raised IAM-1904 for a manual sync once corrected."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-11T08:25:00Z",
      "public": true,
      "body": "Thanks Rachel. The start date change hasn't fully reached Tomasz's account yet. I've asked HR to correct the record and our Identity team to update the account. I'll give you an update by 11:00 at the latest. In the meantime Tomasz could start on the onboarding reading in the welcome pack. Dev"
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-11T10:27:00Z",
      "public": false,
      "body": "IAM-1904 complete 10:24, account enabled. Called Rachel on Workday number 10:27, gave temporary password by phone."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-11T10:29:00Z",
      "public": true,
      "body": "Tomasz's account is now active and I've given you the temporary password by phone. Tomasz will be asked to set a new password and set up Okta Verify at first sign-in. Dev"
     },
     {
      "from": "customer",
      "author": "Rachel Adeyemi",
      "date": "2026-11-11T10:45:00Z",
      "public": true,
      "body": "Tomasz is in. Thanks for chasing."
     }
    ],
    "resolution": "Start date moved earlier; HR sync (ldap-sync-02) skipped record. HR corrected effective date, Identity ran manual sync (IAM-1904), temp password to manager via callback.",
    "kb_used": [
     "KB-8"
    ]
   },
   {
    "key": "ITSD-4171",
    "request_type": "Laptop / Hardware",
    "summary": "Second monitor not working on dock",
    "created": "2026-10-27T14:18:00Z",
    "customer": {
     "name": "Sofie Claes",
     "role": "Customer Service Team Lead"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Sofie Claes",
      "date": "2026-10-27T14:18:00Z",
      "public": true,
      "body": "Only one of my two monitors works on my WD19S dock. The other one says \"no signal\". Worked fine until this week."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-27T14:27:00Z",
      "public": true,
      "body": "Hi Sofie, let's get both screens back. Which laptop model do you have, how are the two monitors connected (which cables, into which ports), and does the second monitor work if you plug it straight into the laptop? Marta"
     },
     {
      "from": "customer",
      "author": "Sofie Claes",
      "date": "2026-10-27T14:43:00Z",
      "public": true,
      "body": "It's a Latitude 7330. One monitor goes HDMI into the dock, the other is DisplayPort daisy-chained from the first monitor. If I plug it into the HDMI port on the laptop it works."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-27T14:48:00Z",
      "public": false,
      "body": "7330 + WD19S: daisy-chain through the monitor's MST hub limit drops the second display on dock firmware below 01.00.36. User's dock likely on older firmware."
     },
     {
      "from": "agent",
      "author": "Marta",
      "date": "2026-10-27T14:50:00Z",
      "public": true,
      "body": "Thanks Sofie, that helps a lot. Please keep the laptop on the dock and plugged into power, open Dell Command Update, install the dock firmware update (01.00.36) and restart. Then connect the second monitor to the dock's DisplayPort directly instead of through the first monitor. Marta"
     },
     {
      "from": "customer",
      "author": "Sofie Claes",
      "date": "2026-10-27T15:18:00Z",
      "public": true,
      "body": "Updated and recabled, both screens are working now!"
     }
    ],
    "resolution": "Dock firmware updated to 01.00.36 via Dell Command Update and second monitor connected directly to dock DisplayPort (MST hub limit).",
    "kb_used": [
     "KB-9"
    ]
   },
   {
    "key": "ITSD-4185",
    "request_type": "Software request",
    "summary": "Need admin rights to install Wireshark",
    "created": "2026-11-03T09:40:00Z",
    "customer": {
     "name": "Lars Jansen",
     "role": "Warehouse Systems Supervisor"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Lars Jansen",
      "date": "2026-11-03T09:40:00Z",
      "public": true,
      "body": "Hi, I need local admin on my laptop to install Wireshark-4.2.5-x64.exe. Can you turn it on for me?"
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-03T09:48:00Z",
      "public": true,
      "body": "Hi Lars, we can't give admin rights on laptops, but let's see how we can get you what you need. What are you trying to troubleshoot with Wireshark? And which cost center are you under, in case licensing is involved? Dev"
     },
     {
      "from": "customer",
      "author": "Lars Jansen",
      "date": "2026-11-03T10:00:00Z",
      "public": true,
      "body": "Our Zebra MC9300 handhelds keep dropping off the warehouse wifi, mostly around aisle 14. I wanted to see what's going on. Cost center CC-4410."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-03T10:06:00Z",
      "public": false,
      "body": "Wireshark is on restricted list RL-12, would need a Security exception. Better path: NetOps can capture on the wireless controller. Raised NET-6620 to NetOps with location detail."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-03T10:08:00Z",
      "public": true,
      "body": "Thanks Lars, that's really useful. Wireshark is a restricted tool, so rather than installing it on your laptop I've passed this to our Network team. They can capture the wireless traffic around aisle 14 directly, which will show more than a laptop capture would. They'll contact you, and I'll update you by Thursday 12:00 either way. Dev"
     },
     {
      "from": "customer",
      "author": "Lars Jansen",
      "date": "2026-11-03T10:20:00Z",
      "public": true,
      "body": "Fine by me, as long as someone looks at it."
     },
     {
      "from": "agent",
      "author": "Dev",
      "date": "2026-11-05T10:00:00Z",
      "public": true,
      "body": "Update: the Network team found interference on the access point covering aisles 12-15 and moved it to a clear channel. Please let us know if the handhelds drop again. Dev"
     }
    ],
    "resolution": "Restricted tool (RL-12); routed to NetOps (NET-6620) who found AP channel interference near aisle 14 and re-channelled.",
    "kb_used": [
     "KB-10"
    ]
   }
  ]
 },
 {
  "id": "saas",
  "title": "SaaS customer support (Ledgerline)",
  "context": "Ledgerline is a B2B accounts-payable and invoicing SaaS used by about 3,000 mid-size companies. Customers are\nadministrators, finance staff and developers at those companies. The Customer Support team (Jira Service\nManagement project SUP) handles billing questions, SAML SSO and SCIM provisioning, and REST API and webhook\nproblems. Level 1 agents answer most tickets; the Billing team lead approves refunds above agent limits, and\nEngineering takes escalations that need code or infrastructure changes. Customers are on Starter, Growth or\nEnterprise plans, billed monthly or annually.",
  "kb": [
   {
    "id": "KB-1",
    "title": "Invoices, billing cycles and proration",
    "body": "Ledgerline bills per active seat. Monthly plans are invoiced on the account's billing anniversary; annual plans are invoiced once per term. Invoices are in Settings > Billing > Invoices and can be downloaded as PDF.\n\nWhen seats are added during a billing period, Ledgerline charges the prorated cost of the new seats for the remaining days of the period. By default the proration is raised as a separate invoice and charged to the card on file the same day, so customers sometimes see two charges in one month and report a \"double charge\". Before treating a charge as an error, check the account's seat history and invoice list; most \"duplicate\" charges are\nproration invoices.\n\nExplain proration in plain numbers: seats added, price per seat, days remaining. If the customer prefers, an agent can change the proration setting to \"Add to next invoice\" under the account's billing profile, so future prorations appear as a line on the regular invoice instead of a separate charge.\n\nCustomers whose accounts payable team needs a purchase order number on invoices can have a PO number added to the billing profile; it prints on all future invoices. Agents can also re-issue existing invoices with the PO number. Ask whether a PO is required whenever a customer mentions their AP team rejecting or failing to match invoices.\n\nA true duplicate charge (same invoice charged twice) is refunded under SOP-2."
   },
   {
    "id": "KB-2",
    "title": "Failed payments, dunning and suspension",
    "body": "When a card payment fails, Ledgerline retries automatically up to four times over 14 days (days 1, 3, 7 and 14) and emails the account's billing contacts after each failure. If the fourth attempt fails, the account is suspended on day 15: users can sign in and export data but cannot create or approve invoices.\n\nMost failures are caused by expired or replaced corporate cards. Ask whether the company changed or cancelled its\ncard recently.\n\nOnly a listed billing contact or admin may update the payment method or discuss amounts owed (SOP-1). If the requester is not listed, ask a listed billing contact to either update the card themselves in Settings > Billing > Payment method, or confirm in writing from their own address that the requester may manage billing; the agent then adds the requester as a billing contact.\n\nOnce a new payment method is saved, Ledgerline retries the outstanding invoice within one hour. A successful payment cancels any scheduled suspension automatically. Agents cannot postpone a suspension by more than 7 days and must record any postponement on the ticket.\n\nDo not tell customers how many retry attempts remain or other internal dunning details; tell them the suspension date shown in their email and what to do before it."
   },
   {
    "id": "KB-3",
    "title": "Refunds and credits",
    "body": "Refunds go back to the original payment method only and take 5 to 10 business days to appear. Credits are applied to the next invoice.\n\nTypical cases:\n- True duplicate charge (the same invoice paid twice): refund the duplicate in full.\n- Seats removed mid-period on a monthly plan: Ledgerline does not refund partial months; removed seats stop billing at the next cycle.\n- Annual plan cancelled mid-term: annual subscriptions are not refundable for unused months. The subscription can be set not to renew, and access continues until the end of the term. Exceptions are decided by the Billing team\nlead only.\n- Service incidents: service credits may be offered when an incident on the status page affected the customer.\n\nAgents may issue refunds or credits up to the limit in SOP-2. Anything above that, and every exception to the policy above, must be approved by the Billing team lead before the customer is told any amount. When escalating, tell the customer that the request is under review and when they will hear back, without suggesting an outcome.\n\nAlways check the billing contact verification (SOP-1) before discussing refund amounts."
   },
   {
    "id": "KB-4",
    "title": "SAML SSO setup and 'audience mismatch' errors",
    "body": "Ledgerline supports SAML 2.0 with any standards-compliant identity provider (Okta, Microsoft Entra ID, ADFS, Google Workspace, OneLogin). Each tenant has its own Entity ID and ACS URL, shown in Admin > Security > SSO. The generic values in the public setup guide are examples only.\n\n\"SAML response audience mismatch\" means the assertion's Audience value does not equal the tenant's Entity ID. It almost always happens after the customer creates a new app in their IdP, migrates to a new IdP, or copies the example Entity ID from documentation.\n\nAsk the customer:\n1. Whether anything changed in their identity provider recently (new IdP, new or rebuilt app, migration).\n2. The exact Identifier (Entity ID) configured in the IdP app.\n\nThen compare it with the Entity ID shown in Admin > Security > SSO and ask the customer to set the IdP's Identifier to that exact value, save, and test with one user. No change is needed on the Ledgerline side.\n\n\"Audience mismatch\" is not a certificate problem; regenerating or uploading certificates will not fix it. For signature errors see KB-5.\n\nAgents can see the expected and received audience values in the internal auth logs. Use them to confirm the cause but explain it in customer terms (SOP-3)."
   },
   {
    "id": "KB-5",
    "title": "SSO 'Signature validation failed' and certificate rotation",
    "body": "\"Signature validation failed\" means the SAML assertion was signed with a certificate that does not match the one stored in Ledgerline. The usual cause is that the customer rotated or renewed the token-signing certificate in their IdP (ADFS, Entra ID, Okta) but did not upload the new certificate to Ledgerline.\n\nAsk the customer whether they rotated or renewed the signing certificate recently, and how many users are affected (to set priority under SOP-4).\n\nThe fix is for a customer admin to upload the new certificate: export the token-signing certificate from the IdP in Base64 (.cer or .pem) format, then go to Admin > Security > SSO > Replace certificate. Logins work immediately after\nsaving.\n\nWhile users are locked out, an agent may enable a temporary password login (admin bypass) for up to two listed admins for 24 hours, after confirming under SOP-1 that the requester is a listed admin, so that they can upload the certificate. Remove the bypass once the certificate is replaced.\n\nDo not disable SSO enforcement for the whole tenant as a fix: every user would have to set a password, which takes longer and weakens the customer's security policy. Only a listed admin can request that change, and it must be in\nwriting.\n\nRecommend that customers add the new certificate as a secondary certificate before rotating, so the change causes\nno downtime."
   },
   {
    "id": "KB-6",
    "title": "SCIM provisioning: users not syncing or '409 Conflict'",
    "body": "Ledgerline's SCIM 2.0 endpoint creates, updates and deactivates users from Okta or Microsoft Entra ID.\n\nA \"409 Conflict\" on user creation means a Ledgerline user with the same userName (email) already exists in the tenant. Ledgerline keeps deactivated users for audit history, so the most common cause is that the person used to have a Ledgerline account (invited manually or deactivated earlier) and the IdP is now trying to create them again.\n\nAsk the customer:\n1. Whether the failing users had Ledgerline accounts before, including deactivated ones.\n2. The provisioning scope in the IdP (\"sync all users\" or \"sync only assigned users and groups\"), to make sure the users are actually in scope.\n3. One example user's email.\n\nResolution options for the customer admin, in Admin > Users > Deactivated:\n- Reactivate the user. The IdP will match the existing account on the next cycle and history is kept.\n- Permanently delete the user. The IdP then creates a fresh account; history for that user is lost.\n\nAfter either option, ask the customer to run \"Provision on demand\" for one test user, then restart the provisioning\ncycle.\n\nA 409 is not a Ledgerline defect; do not escalate to Engineering unless the conflicts continue after the deactivated records are dealt with."
   },
   {
    "id": "KB-7",
    "title": "API authentication errors (401 and 403)",
    "body": "The Ledgerline REST API uses Bearer API keys. Keys are created under Developers > API keys. Production keys start with llk_live_ and only work against https://api.ledgerline.io/v2. Sandbox keys start with llk_test_ and only work\nagainst https://api.sandbox.ledgerline.io/v2.\n\n401 with \"invalid_token\" means the key is unknown, revoked, or used against the wrong environment. 403 with \"insufficient_scope\" means the key is valid but lacks the scope for that endpoint.\n\nAsk the developer:\n1. Which base URL they are calling.\n2. The key prefix (never the full key; tell them not to send it).\n3. A request ID from the X-Request-Id response header of a failing call.\n\nCommon causes, in order: a live key used against sandbox or a test key against production, often after key rotation when only one config value was updated; the old key still deployed somewhere after revocation; a missing \"Bearer \" prefix in the Authorization header.\n\nDo not suggest generating yet another key until the environment and prefix are confirmed; a new key does not fix an\nenvironment mismatch."
   },
   {
    "id": "KB-8",
    "title": "API rate limits and '429 Too Many Requests'",
    "body": "Rate limits are per tenant and depend on the plan: Starter 5 requests per second, Growth 20 requests per second, Enterprise 100 requests per second. Every 429 response includes a Retry-After header with the number of seconds to\nwait.\n\nAsk the customer:\n1. Their peak request rate.\n2. Their plan.\n3. Whether their client waits for Retry-After before retrying.\n\nClients that retry immediately after a 429 create a retry storm that multiplies traffic and keeps the tenant\nthrottled.\n\nRecommended fixes:\n- Use the batch endpoint /v2/invoices/batch, which accepts up to 100 invoices per call and counts as one request.\n- Honor Retry-After and use exponential backoff.\n- Spread large jobs over time.\n\nAgents cannot raise rate limits. A permanent increase requires a plan change through the customer's account manager; temporary increases are not offered. Do not promise any limit change.\n\nInternal rate-limit metrics show each tenant's observed peak rate. Use them to confirm a retry storm, but share only the general conclusion with the customer (SOP-3), for example \"your client retries faster than the limit allows\"."
   },
   {
    "id": "KB-9",
    "title": "Webhooks not delivered",
    "body": "Ledgerline sends webhooks (for example invoice.paid, invoice.approved, vendor.updated) as HTTPS POST requests. The endpoint must return a 2xx status within 10 seconds. Failed deliveries are retried with backoff for 72 hours and are listed under Developers > Webhooks > Failed deliveries, where they can be replayed.\n\nAsk the customer:\n1. The registered endpoint URL.\n2. What changed on their side around the time deliveries stopped: firewall or WAF rules, a CDN or proxy, a new load balancer, a certificate change, or a code deploy.\n\nIf the customer sees nothing in their application logs, the requests are usually being blocked before they reach the application, typically by a WAF or bot protection. Ask the customer to allowlist the webhook source IP ranges (published at Developers > Webhooks > IP ranges) or add a WAF skip rule for the webhook path. Then replay the failed deliveries from the dashboard. Events older than 72 hours cannot be replayed; the customer can fetch them through\nthe API instead.\n\nDescribe what the delivery logs show in general terms (for example \"our requests are being rejected before they reach your app\") without naming internal systems (SOP-3)."
   },
   {
    "id": "KB-10",
    "title": "Changing the account owner",
    "body": "Each Ledgerline tenant has one account owner, who controls billing, security settings and admin roles. Ownership can be transferred in Admin > Account > Owner by the current owner or by any listed admin.\n\nWhen the owner has left the company and no admin is available to make the change, support can transfer ownership only with one of the following:\n- Written confirmation from a listed admin, sent from their own company email address, naming the new owner.\n- A signed letter on company letterhead from the person who signed the Ledgerline contract (or a successor officer), naming the new owner.\n\nAsk the requester whether another admin is still active, and who signed the contract. Do not transfer ownership on the requester's word alone, even if their email domain matches the tenant.\n\nOnce approved, transfer ownership, remove the former owner's admin rights if requested, and ask the new owner to review the admin list under Admin > Users.\n\nDo not share audit log details about the former owner with the requester beyond confirming the transfer."
   },
   {
    "id": "KB-11",
    "title": "API 5xx errors and incidents",
    "body": "Occasional 500, 502 or 503 responses can happen during deploys or incidents. First check the public status page. If an incident is open, link the customer to it and tell them updates will be posted there; do not give your own estimate of when it will be fixed.\n\nIf there is no incident, ask the customer for:\n1. At least three request IDs (X-Request-Id) of failing calls.\n2. Timestamps with time zone.\n3. The endpoint and HTTP method.\n4. Whether the failures are constant or intermittent.\n\nEscalate to Engineering with these details and the tenant ID under SOP-4. Tell the customer when they will hear from support next, not when the fix will ship.\n\nAdvise customers to retry 5xx errors with exponential backoff and idempotency keys (Idempotency-Key header) on POST requests, so a retry cannot create duplicate invoices. Never ask the customer to send API keys or full request payloads containing bank details; request IDs are enough for Engineering to trace calls."
   }
  ],
  "sop": [
   {
    "id": "SOP-1",
    "title": "Account verification",
    "body": "Before discussing billing details or amounts owed, changing payment methods or billing contacts, transferring account ownership, enabling an admin bypass or changing SSO enforcement, confirm that the requester is a listed billing contact or admin on the account (the requester's email must match the contact list). If the requester is not listed, do not disclose account details or make the change; ask a listed contact to confirm in writing from their own address, or to make the change themselves. Record the verification in an internal note."
   },
   {
    "id": "SOP-2",
    "title": "Refund and credit limits",
    "body": "Agents may issue refunds or credits up to $500 per ticket, and never more than one month of the customer's subscription. Anything above that, and any exception to KB-3 (such as refunds of unused annual terms), requires Billing team lead approval before the customer is told any amount or outcome. Refunds go to the original payment\nmethod only."
   },
   {
    "id": "SOP-3",
    "title": "Confidentiality",
    "body": "Do not share with customers: internal hostnames, service or tool names, raw internal log lines, internal ticket or approval IDs (ENG-, BILL-, OT-), internal metrics, or information about other customers. Never ask customers for full API keys, passwords or private keys. Explain causes in plain customer terms."
   },
   {
    "id": "SOP-4",
    "title": "Escalation and commitments",
    "body": "Do not promise fix dates, feature delivery or plan-limit changes. For Engineering escalations collect request IDs, timestamps and the tenant ID. Give the customer a next-update time: P1 (all users blocked) within 1 hour, P2 within 4 hours, P3 next business day. Point to the status page during incidents."
   },
   {
    "id": "SOP-5",
    "title": "Tone",
    "body": "Be professional and empathetic; acknowledge business impact (month-end, payroll, close). Never blame the customer or their team, even when the cause is on their side; explain it neutrally. No sarcasm, slang or condescension. Do not ask for information the customer has already provided."
   }
  ],
  "tickets": [
   {
    "key": "SUP-7701",
    "request_type": "Billing",
    "summary": "Charged twice in October?",
    "created": "2026-10-20T14:05:00Z",
    "customer": {
     "name": "Fiona Walsh",
     "role": "Finance Manager, Northpeak Logistics"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Fiona Walsh",
      "date": "2026-10-20T14:05:00Z",
      "public": true,
      "body": "Hi, we've been charged twice this month. Invoice INV-2026-10-4471 for $1,840 is our normal monthly, but there's also a separate card charge of $312.80 on 17 October that I can't match to anything. Can you explain or refund it?"
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-20T14:09:00Z",
      "public": false,
      "body": "Requester fiona.walsh@northpeak.com is a listed Billing contact. Verified per SOP-1."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-20T14:14:00Z",
      "public": true,
      "body": "Hi Fiona, thanks for flagging this, I'll get to the bottom of it. Did anything change on the account in October, such as users or seats being added? And does your AP team need a PO number on our invoices to match them?\nBest, Ines"
     },
     {
      "from": "customer",
      "author": "Fiona Walsh",
      "date": "2026-10-20T14:45:00Z",
      "public": true,
      "body": "Ah, yes, our ops team added 8 seats mid-month for the new depot. And yes, everything needs PO-55102 on it or AP\nrejects it."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-20T14:51:00Z",
      "public": false,
      "body": "$312.80 = proration invoice INV-2026-10-4528: 8 seats x $69 x 17/30 days. Card charge ch_3QxL9 on 17 Oct. Not a duplicate. Added PO to billing profile and re-issued both invoices."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-20T14:54:00Z",
      "public": true,
      "body": "Thanks Fiona, that explains it. The $312.80 is the prorated cost of the 8 new seats for the 17 days left in your billing period (8 x $69 x 17/30). It's on a separate invoice, INV-2026-10-4528, so it isn't a duplicate. I've added PO-55102 to your billing profile and re-issued both October invoices with it; you'll find them under Settings > Billing > Invoices. Best, Ines"
     },
     {
      "from": "customer",
      "author": "Fiona Walsh",
      "date": "2026-10-20T15:15:00Z",
      "public": true,
      "body": "Makes sense, thanks. Could future proration go onto the regular monthly invoice instead of a separate charge?"
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-20T15:20:00Z",
      "public": true,
      "body": "Done: I've set proration to \"Add to next invoice\", so any future seat changes will appear as a line on your regular monthly invoice. Best, Ines"
     }
    ],
    "resolution": "Charge was a proration invoice (INV-2026-10-4528) for 8 added seats; PO-55102 added and invoices re-issued; proration switched to 'Add to next invoice'.",
    "kb_used": [
     "KB-1"
    ]
   },
   {
    "key": "SUP-7712",
    "request_type": "Billing",
    "summary": "Account suspension warning - need to update card",
    "created": "2026-11-09T10:12:00Z",
    "customer": {
     "name": "Tom Becker",
     "role": "IT Manager, Halden Foods"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Tom Becker",
      "date": "2026-11-09T10:12:00Z",
      "public": true,
      "body": "We got an email saying our Ledgerline account will be suspended on 20 November because of a failed payment. I need to update the card today and want to know how much is outstanding. This cannot be suspended, our whole AP team runs\non it."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-11-09T10:17:00Z",
      "public": false,
      "body": "tom.becker@haldenfoods.com is NOT a listed admin or billing contact (billing contact is in their Finance team). Dunning attempt 3 of 4 failed, card expired."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-11-09T10:23:00Z",
      "public": true,
      "body": "Hi Tom, I understand how important this is and we'll make sure it's sorted before the 20th. For security I can only discuss billing details or payment changes with the people listed as billing contacts on the account. Could you ask your billing contact to reply here (or email us from their own address) confirming that you can manage billing? They can also update the card themselves under Settings > Billing > Payment method. One question in the meantime: has your company changed its corporate card recently? Kofi"
     },
     {
      "from": "customer",
      "author": "Tom Becker",
      "date": "2026-11-09T10:37:00Z",
      "public": true,
      "body": "Ugh, OK. Yes, finance switched everything to a new Amex last month and the old Visa was cancelled. I'll get our finance person to confirm."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-11-09T11:47:00Z",
      "public": false,
      "body": "Billing contact emailed from listed address confirming Tom may manage billing. Added Tom as billing contact. Verified per SOP-1. Outstanding INV-2026-10-3310 $2,760."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-11-09T11:50:00Z",
      "public": true,
      "body": "Thanks Tom, your finance team has confirmed and I've added you as a billing contact. The outstanding amount is $2,760 on invoice INV-2026-10-3310. Please add the new card under Settings > Billing > Payment method. Once it's saved we retry the payment within an hour, and a successful payment cancels the suspension automatically. Kofi"
     },
     {
      "from": "customer",
      "author": "Tom Becker",
      "date": "2026-11-09T12:02:00Z",
      "public": true,
      "body": "Added the Amex. Anything else I need to do?"
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-11-09T13:02:00Z",
      "public": true,
      "body": "Nothing else: the payment went through and the suspension is cancelled. Thanks for sorting it so quickly. Kofi"
     }
    ],
    "resolution": "Requester not a listed contact; billing contact confirmed in writing; requester added; new card saved and INV-2026-10-3310 paid on retry.",
    "kb_used": [
     "KB-2"
    ]
   },
   {
    "key": "SUP-7720",
    "request_type": "SSO",
    "summary": "SSO login failing - audience mismatch",
    "created": "2026-10-13T07:48:00Z",
    "customer": {
     "name": "Arjun Mehta",
     "role": "IT Systems Administrator, Brightline Media"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Arjun Mehta",
      "date": "2026-10-13T07:48:00Z",
      "public": true,
      "body": "Since this morning nobody can log in through SSO. Users authenticate fine and then get \"SAML response audience mismatch\" on the Ledgerline page. We haven't touched any Ledgerline settings."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-13T07:54:00Z",
      "public": true,
      "body": "Hi Arjun, sorry for the disruption, let's get your users back in. Has anything changed on your identity provider side recently, e.g. a new IdP, a rebuilt app or a migration? And what value is configured as the Identifier (Entity ID) in the IdP app for Ledgerline? Ines"
     },
     {
      "from": "customer",
      "author": "Arjun Mehta",
      "date": "2026-10-13T08:02:00Z",
      "public": true,
      "body": "We cut over from Okta to Entra ID last night and I rebuilt the app from your setup guide. The Identifier is\nurn:ledgerline:brightline."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-13T08:07:00Z",
      "public": false,
      "body": "authsvc-eu-3 logs: expected audience https://sso.ledgerline.io/saml/48810, received urn:ledgerline:brightline. Customer copied the example format from the guide."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-13T08:09:00Z",
      "public": true,
      "body": "Thanks, that's the cause. Each Ledgerline tenant has its own Entity ID, and the one in the guide is just an example. In Entra ID, open the Ledgerline enterprise app > Single sign-on > Basic SAML Configuration and set Identifier (Entity ID) to https://sso.ledgerline.io/saml/48810 (you can also see it in Ledgerline under Admin > Security > SSO). Save, then test with one user. Ines"
     },
     {
      "from": "customer",
      "author": "Arjun Mehta",
      "date": "2026-10-13T08:21:00Z",
      "public": true,
      "body": "That worked, everyone's getting in. Your guide makes it look like you can pick any identifier though, might want to\nfix that."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-13T08:24:00Z",
      "public": true,
      "body": "Glad it's working. Good point about the guide; I've passed it to our documentation team. Ines"
     }
    ],
    "resolution": "IdP migrated to Entra ID with example identifier; set Identifier to tenant Entity ID https://sso.ledgerline.io/saml/48810.",
    "kb_used": [
     "KB-4"
    ]
   },
   {
    "key": "SUP-7733",
    "request_type": "SSO",
    "summary": "URGENT all users locked out - signature validation failed",
    "created": "2026-10-29T16:02:00Z",
    "customer": {
     "name": "Sanne de Groot",
     "role": "IT Director, Velda Retail"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Sanne de Groot",
      "date": "2026-10-29T16:02:00Z",
      "public": true,
      "body": "URGENT. All our users get \"Signature validation failed\" when logging in with SSO. Nobody can access Ledgerline and month-end close is tomorrow. Disable SSO enforcement now so people can use passwords!"
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-29T16:05:00Z",
      "public": false,
      "body": "Requester is a listed Admin, verified per SOP-1. idp-cert-monitor alert: assertions signed with thumbprint 9F:3A:7C..., stored cert is the previous one."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-29T16:08:00Z",
      "public": true,
      "body": "Hi Sanne, understood, let's get everyone back in as fast as possible. Did you rotate or renew the signing certificate on your identity provider recently? And roughly how many users are affected? Kofi"
     },
     {
      "from": "customer",
      "author": "Sanne de Groot",
      "date": "2026-10-29T16:12:00Z",
      "public": true,
      "body": "We rotated the token-signing cert in ADFS on Monday because the old one was expiring. All of them, around 240 users."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-29T16:16:00Z",
      "public": true,
      "body": "Thanks, that's the cause: Ledgerline still has your previous certificate. The fastest fix is to upload the new one rather than switch 240 people to passwords. Export the token-signing certificate from ADFS in Base64 (.cer), then go to Admin > Security > SSO > Replace certificate; logins work as soon as it's saved. I've enabled a temporary password login for you as a listed admin so you can get in and make the change. Kofi"
     },
     {
      "from": "customer",
      "author": "Sanne de Groot",
      "date": "2026-10-29T16:33:00Z",
      "public": true,
      "body": "Uploaded. People are getting in again. Thank you!"
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-29T16:36:00Z",
      "public": true,
      "body": "Great news. I've removed your temporary password login. For next time, you can add the new certificate as a secondary certificate before rotating and there'll be no downtime. Kofi"
     }
    ],
    "resolution": "Customer rotated ADFS signing cert; new cert uploaded via Admin > Security > SSO with a temporary admin bypass; bypass removed.",
    "kb_used": [
     "KB-5"
    ]
   },
   {
    "key": "SUP-7745",
    "request_type": "Provisioning",
    "summary": "SCIM 409 Conflict for some users",
    "created": "2026-10-07T11:30:00Z",
    "customer": {
     "name": "Luis Romero",
     "role": "IAM Engineer, Tessaro Group"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Luis Romero",
      "date": "2026-10-07T11:30:00Z",
      "public": true,
      "body": "Our Entra provisioning logs show \"409 Conflict\" for about a dozen users when it tries to create them in Ledgerline. Everyone else syncs fine. Example: k.adeyemi@tessaro.com."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-07T11:38:00Z",
      "public": true,
      "body": "Hi Luis, thanks for the example. Did these users have Ledgerline accounts before, for example invited manually or deactivated at some point? And is the provisioning app set to sync all users or only assigned users and groups? Ines"
     },
     {
      "from": "customer",
      "author": "Luis Romero",
      "date": "2026-10-07T11:52:00Z",
      "public": true,
      "body": "Now you mention it, a bunch of them were deactivated in March when the old finance team was restructured. Scope is \"Sync only assigned users and groups\"."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-07T11:57:00Z",
      "public": false,
      "body": "scim-gw-02 logs: POST /Users conflicts on userName against deactivated records. Matches KB-6."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-07T12:00:00Z",
      "public": true,
      "body": "That's the cause. Ledgerline keeps deactivated users for audit history, so when Entra tries to create them again the email is already taken. In Admin > Users > Deactivated you can either reactivate them (keeps their history) or Permanently delete them and let Entra create fresh accounts. Afterwards, run \"Provision on demand\" for one user to test, then restart the provisioning cycle. Ines"
     },
     {
      "from": "customer",
      "author": "Luis Romero",
      "date": "2026-10-07T12:22:00Z",
      "public": true,
      "body": "Reactivated and provisioned on demand, k.adeyemi is in now. Restarting the cycle for the rest."
     },
     {
      "from": "customer",
      "author": "Luis Romero",
      "date": "2026-10-07T13:50:00Z",
      "public": true,
      "body": "All 12 synced. Thanks."
     }
    ],
    "resolution": "Conflicts with users deactivated in March; customer reactivated them in Admin > Users > Deactivated and re-ran provisioning.",
    "kb_used": [
     "KB-6"
    ]
   },
   {
    "key": "SUP-7752",
    "request_type": "API",
    "summary": "401 invalid_token after key rotation",
    "created": "2026-10-22T13:15:00Z",
    "customer": {
     "name": "Chen Wei",
     "role": "Backend Developer, Paysmith"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Chen Wei",
      "date": "2026-10-22T13:15:00Z",
      "public": true,
      "body": "After rotating our API key yesterday every call returns 401 Unauthorized with {\"error\":\"invalid_token\"}. The old key was revoked. We're using Bearer auth as documented."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-22T13:22:00Z",
      "public": true,
      "body": "Hi Chen, let's track it down. Which base URL are you calling? What prefix does the new key start with (please don't send the full key)? And could you share a request ID from the X-Request-Id header of a failing call? Kofi"
     },
     {
      "from": "customer",
      "author": "Chen Wei",
      "date": "2026-10-22T13:33:00Z",
      "public": true,
      "body": "Base URL is https://api.sandbox.ledgerline.io/v2. Key starts with llk_live_. Request ID req_7Fh2Kq9."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-22T13:39:00Z",
      "public": false,
      "body": "apigw-sbx-1 log for req_7Fh2Kq9: key_env=live presented to sandbox host. Environment mismatch."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-22T13:41:00Z",
      "public": true,
      "body": "Found it: the new key is a production key, but the calls go to the sandbox URL. Production keys only work on https://api.ledgerline.io/v2, and sandbox needs a key starting with llk_test_. Either switch the base URL to production or create a sandbox key under Developers > API keys > Sandbox. Kofi"
     },
     {
      "from": "customer",
      "author": "Chen Wei",
      "date": "2026-10-22T13:56:00Z",
      "public": true,
      "body": "Doh. The config var for the URL didn't get updated with the rotation. Fixed, getting 200s now."
     }
    ],
    "resolution": "Production key used against sandbox base URL after rotation; customer switched base URL.",
    "kb_used": [
     "KB-7"
    ]
   },
   {
    "key": "SUP-7768",
    "request_type": "API",
    "summary": "429 errors during month-end invoice upload",
    "created": "2026-10-28T09:20:00Z",
    "customer": {
     "name": "Olga Petrova",
     "role": "Integration Lead, Marlow & Finch"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Olga Petrova",
      "date": "2026-10-28T09:20:00Z",
      "public": true,
      "body": "During month-end our invoice upload job gets lots of \"429 Too Many Requests\" and fails halfway through. We need a higher limit urgently, close is in 2 days."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-28T09:26:00Z",
      "public": true,
      "body": "Hi Olga, let's get your close through. How many requests per second does the job send at peak? Which Ledgerline plan are you on? And when it gets a 429, does your client wait for the Retry-After header before retrying? Ines"
     },
     {
      "from": "customer",
      "author": "Olga Petrova",
      "date": "2026-10-28T09:40:00Z",
      "public": true,
      "body": "It fires roughly 50 requests per second, one invoice per call. We're on the Growth plan. Honestly I think we ignore the Retry-After header, it just retries immediately."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-28T09:45:00Z",
      "public": false,
      "body": "Rate-limit metrics: tenant peak 312 rps from immediate retries (retry storm). Growth = 20 rps. Recommend batch endpoint /v2/invoices/batch + honoring Retry-After."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-10-28T09:48:00Z",
      "public": true,
      "body": "Thanks Olga. The Growth plan allows 20 requests per second, and immediate retries multiply the traffic, which keeps the job throttled. Two changes should fix it: send invoices through /v2/invoices/batch, which takes up to 100 invoices per call and counts as one request, and wait the number of seconds in Retry-After before any retry. That brings you well under the limit. A higher permanent limit would need a plan change; I can put you in touch with your account manager if you'd like to discuss. Ines"
     },
     {
      "from": "customer",
      "author": "Olga Petrova",
      "date": "2026-10-28T14:20:00Z",
      "public": true,
      "body": "Switched to batch with backoff and the run finished in 6 minutes with zero 429s. Great."
     }
    ],
    "resolution": "Retry storm on Growth plan; customer moved to /v2/invoices/batch and honored Retry-After.",
    "kb_used": [
     "KB-8"
    ]
   },
   {
    "key": "SUP-7779",
    "request_type": "API",
    "summary": "invoice.paid webhooks stopped arriving",
    "created": "2026-10-26T09:15:00Z",
    "customer": {
     "name": "Ben Carter",
     "role": "DevOps Engineer, Quayside Freight"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Ben Carter",
      "date": "2026-10-26T09:15:00Z",
      "public": true,
      "body": "We stopped receiving invoice.paid webhooks sometime on Friday. Nothing at all in our logs. Did you change something?"
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-26T09:24:00Z",
      "public": true,
      "body": "Hi Ben, sorry for the trouble. Which endpoint URL is registered for the webhook? And did anything change on your side around Friday, such as firewall or WAF rules, a CDN, a load balancer or a certificate? Kofi"
     },
     {
      "from": "customer",
      "author": "Ben Carter",
      "date": "2026-10-26T09:36:00Z",
      "public": true,
      "body": "Endpoint is https://hooks.quaysidefreight.com/ledgerline. On Friday we put our public endpoints behind Cloudflare, but that shouldn't block you."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-26T09:41:00Z",
      "public": false,
      "body": "whdispatch-07: every delivery since Fri 16:40 got HTTP 403 from the endpoint (WAF / bot protection). 37 events failed, all within the 72h replay window."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-26T09:44:00Z",
      "public": true,
      "body": "Thanks Ben, that lines up: since Friday afternoon our delivery attempts are being rejected with a 403 before they reach your app, which points to the new WAF rules. Please allowlist our webhook source IPs (Developers > Webhooks > IP ranges) or add a WAF skip rule for the /ledgerline path. Then go to Developers > Webhooks > Failed deliveries and replay the missed events; they're kept for 72 hours, so do it today. Kofi"
     },
     {
      "from": "customer",
      "author": "Ben Carter",
      "date": "2026-10-26T10:03:00Z",
      "public": true,
      "body": "Added a skip rule, replayed, and all the missed events came through. Thanks."
     }
    ],
    "resolution": "WAF in front of endpoint returned 403; customer added skip rule and replayed 37 failed deliveries.",
    "kb_used": [
     "KB-9"
    ]
   },
   {
    "key": "SUP-7786",
    "request_type": "Billing",
    "summary": "Cancel annual plan and refund unused months",
    "created": "2026-11-02T15:40:00Z",
    "customer": {
     "name": "Ruth Adler",
     "role": "CFO, Kinsell Partners"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Ruth Adler",
      "date": "2026-11-02T15:40:00Z",
      "public": true,
      "body": "We're on an annual plan ($14,400 a year) that renewed recently. We no longer need Ledgerline and want to cancel and get a refund for the unused months, roughly $6,200 by my count."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-11-02T15:44:00Z",
      "public": false,
      "body": "Requester is a listed Billing contact and the contract signer. Verified per SOP-1."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-11-02T15:50:00Z",
      "public": true,
      "body": "Hi Ruth, I'm sorry to hear you're leaving. Could I ask what's prompted the change, and when your current annual term\nstarted? Ines"
     },
     {
      "from": "customer",
      "author": "Ruth Adler",
      "date": "2026-11-02T16:32:00Z",
      "public": true,
      "body": "We were acquired by Halvorsen Group and they standardise on a different tool. Our term renewed on 1 August."
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-11-02T16:40:00Z",
      "public": true,
      "body": "Thanks Ruth. Annual subscriptions aren't normally refundable for unused months, but given the circumstances I've asked our Billing team lead to review your request. You'll hear from us by end of day tomorrow. In the meantime nothing changes for your users. Ines"
     },
     {
      "from": "agent",
      "author": "Ines",
      "date": "2026-11-03T06:40:00Z",
      "public": false,
      "body": "BILL-3390: Billing lead approved one-off goodwill refund of $1,200 (one month) and non-renewal; term ends 31 Jul 2027."
     },
     {
      "from": "agent",
      "author": "Rafael",
      "date": "2026-11-03T06:45:00Z",
      "public": true,
      "body": "Hi Ruth, I'm Rafael, the Billing team lead. We can't refund the remaining term, but we've approved a one-off refund of $1,200 to your original payment method, and your subscription is set to end on 31 July 2027 with no renewal. Your users keep access until then."
     },
     {
      "from": "customer",
      "author": "Ruth Adler",
      "date": "2026-11-03T08:00:00Z",
      "public": true,
      "body": "Not what I hoped, but appreciated. Please confirm in writing that auto-renew is off."
     },
     {
      "from": "agent",
      "author": "Rafael",
      "date": "2026-11-03T08:10:00Z",
      "public": true,
      "body": "Confirmed: auto-renewal is off and the subscription ends on 31 July 2027. The $1,200 refund will appear in 5-10\nbusiness days."
     }
    ],
    "resolution": "Annual plan not refundable; Billing lead approved one-off $1,200 goodwill refund (BILL-3390) and turned off auto-renewal.",
    "kb_used": [
     "KB-3"
    ]
   },
   {
    "key": "SUP-7794",
    "request_type": "Account",
    "summary": "Account owner left - need ownership transferred",
    "created": "2026-10-16T12:00:00Z",
    "customer": {
     "name": "Omar Haddad",
     "role": "Operations Director, Fenwick Supply"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Omar Haddad",
      "date": "2026-10-16T12:00:00Z",
      "public": true,
      "body": "Our Ledgerline account owner, Mark Ellison, left the company last month and now we can't change anything in billing or security settings. Please make me the account owner. I'm the Operations Director."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-16T12:04:00Z",
      "public": false,
      "body": "omar.haddad@fenwicksupply.com is not a listed admin. Owner = Mark Ellison; audit log shows last owner login 12 September."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-16T12:10:00Z",
      "public": true,
      "body": "Hi Omar, we can help transfer ownership. For security we need confirmation from someone already authorised on the account. Is there another admin on your Ledgerline account who is still active? If not, who signed your Ledgerline\ncontract? Kofi"
     },
     {
      "from": "customer",
      "author": "Omar Haddad",
      "date": "2026-10-16T12:30:00Z",
      "public": true,
      "body": "Priyanka Das in finance is still an admin I think. The contract was signed by our CFO, Daniel Okoro."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-16T12:36:00Z",
      "public": true,
      "body": "Thanks. The quickest route is for Priyanka to reply to this ticket from a company email address confirming you should become the owner, or to transfer ownership herself under Admin > Account > Owner. If that's not possible, we can accept a signed letter from Daniel on company letterhead. Kofi"
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-16T14:40:00Z",
      "public": false,
      "body": "Priyanka Das (listed Admin) confirmed transfer from verified address. Transfer ref OT-118 completed. Mark's admin rights removed at Priyanka's request."
     },
     {
      "from": "agent",
      "author": "Kofi",
      "date": "2026-10-16T14:43:00Z",
      "public": true,
      "body": "Thanks Omar, Priyanka has confirmed and you're now the account owner. Mark's access has been removed. Please review the admin list under Admin > Users. Kofi"
     },
     {
      "from": "customer",
      "author": "Omar Haddad",
      "date": "2026-10-16T15:20:00Z",
      "public": true,
      "body": "Perfect, I can see billing now. Thanks."
     }
    ],
    "resolution": "Listed admin confirmed in writing; ownership transferred (OT-118) and former owner removed.",
    "kb_used": [
     "KB-10"
    ]
   }
  ]
 },
 {
  "id": "retail",
  "title": "Retail customer care (Fernwood Outdoor)",
  "context": "Fernwood Outdoor Co. is an online retailer of camping, hiking and paddling gear shipping across the US from two\nfulfilment centers. The Customer Care team (Jira Service Management project CS) handles email and chat about order\nstatus, deliveries, returns and refunds, damaged or wrong items, price adjustments, cancellations and backorders.\nAgents can issue refunds and reships within their authority; supervisors approve larger refunds and exceptions.\nOrders are numbered FW-nnnnnn.",
  "kb": [
   {
    "id": "KB-1",
    "title": "Order status and tracking",
    "body": "Order statuses: Processing (payment authorized, not yet sent to the warehouse), Released (sent to the warehouse), Picking, Shipped (label created and handed to the carrier) and Delivered.\n\nCustomers receive a shipping email with tracking when the order ships. Tracking may show \"Label created\" for up to one business day before the carrier's first scan.\n\nIf tracking shows \"Label created\" with no carrier scan after 3 business days, ask the warehouse to check whether the parcel was handed over. If tracking shows \"In transit\" with no movement for 7 calendar days or more, treat the parcel\nas lost (KB-3).\n\nCarrier delivery estimates are estimates. Quote them as the carrier's estimate and never as a guarantee (SOP-4).\n\nWhen customers ask where an order is, ask for the order number if it was not given, check the status and tracking, and explain in plain words what the status means. Do not paste internal warehouse system codes or scan data; tell the customer what is happening and what happens next.\n\nOrders with several items may ship in more than one box; each box has its own tracking number in the shipping email."
   },
   {
    "id": "KB-2",
    "title": "Package marked delivered but not received",
    "body": "Most packages marked delivered but not found turn up within 24 hours: left with a neighbor, in a mailroom or package room, at a back door, or scanned early by the driver.\n\nSteps:\n1. Verify the requester under SOP-1.\n2. Ask whether the building has a mailroom, package room or front office, and ask the customer to check with neighbors and around the property.\n3. If the parcel is still missing after these checks, open an investigation with the carrier.\n4. If it has not turned up 2 business days after the investigation is opened, offer the customer a replacement (if in stock) or a full refund, whichever they prefer. Reships are limited to one per order without supervisor\napproval (SOP-4).\n\nDo not reship or refund on the first contact unless the customer has already done the checks above and the investigation has been open for 2 business days.\n\nCarrier scan details such as GPS coordinates are internal evidence for the investigation. Do not quote them to the customer (SOP-3); say that the carrier is investigating the delivery.\n\nOrders over $500 ship with signature required, so this situation is rare for them; escalate those to a supervisor."
   },
   {
    "id": "KB-3",
    "title": "Lost in transit",
    "body": "A parcel is treated as lost when tracking shows no movement for 7 calendar days or more, or when the carrier confirms it is lost.\n\nWhen a parcel is lost:\n1. Apologize and confirm the order details.\n2. Ask whether the customer needs the item by a specific date, so you can choose the shipping speed for the\nreplacement.\n3. Open a carrier trace.\n4. Offer a replacement shipped at no cost, or a full refund. If the customer has a deadline and the item is in stock, agents may upgrade the replacement to 2-day shipping at no cost.\n5. Tell the customer that if the original parcel arrives later, they can refuse it or return it with a free label.\n\nGive the carrier's estimated delivery date as an estimate. Do not guarantee arrival before the customer's deadline\n(SOP-4).\n\nDo not tell a customer to keep waiting once the 7-day threshold has passed; at that point the agent acts.\n\nTrace reference numbers and fulfilment center codes are internal and are not shared with customers (SOP-3)."
   },
   {
    "id": "KB-4",
    "title": "Returns and refunds",
    "body": "Fernwood accepts returns of unused items within 60 days of delivery, in original condition. Final sale items cannot\nbe returned.\n\nCustomers start a return from their order page or by contacting Customer Care. A prepaid return label costs $7.95, deducted from the refund, unless the return is due to our error (wrong or damaged item) or a defect.\n\nRefunds go to the original payment method and are issued after the warehouse receives and inspects the return, normally within 3 business days of receipt. Banks then take 5 to 7 business days to show the refund.\n\nWhen a customer says a refund has not arrived:\n1. Ask for the return tracking number and how they sent the return (drop-off location or pickup).\n2. Check whether the warehouse received it. If it was received more than 3 business days ago and no refund was issued, the inspection is delayed; the agent may release it and issue the refund.\n3. Tell the customer the refund amount and when to expect it.\n\nDo not share internal queue or hold codes with customers; say the inspection was delayed and apologize.\n\nReturns after 60 days need supervisor approval, except defects covered by warranty (KB-5)."
   },
   {
    "id": "KB-5",
    "title": "Damaged, defective and warranty issues",
    "body": "Damaged in shipping: ask the customer for photos of the item and the outer box, and whether the box was damaged. Photos are required before any replacement or refund.\n- Items under $75: send a replacement or refund without requiring a return.\n- Items $75 and over: send a replacement right away (if in stock) and email a free return label; the damaged item must be returned within 30 days.\n\nDefects: Fernwood gear carries a 1-year warranty against manufacturing defects (failed zippers, seams, buckles, poles). A defect that appears after the 60-day return window is handled as a warranty claim, not a return: ask when the item was bought, how it has been used, and for a photo of the defect, then send a replacement with a free label for the defective item. Do not refuse a defect claim just because the return window has passed.\n\nNormal wear, misuse and damage from accidents are not covered.\n\nCarrier damage claims are filed by the agent internally; their reference numbers are not shared with customers\n(SOP-3).\n\nRefunds and goodwill above the agent limits in SOP-2 need supervisor approval."
   },
   {
    "id": "KB-6",
    "title": "Order changes and cancellations",
    "body": "Customers can cancel or change an order until it is released to the warehouse; after the status reaches Picking, the order can no longer be cancelled and the customer should return it after delivery instead.\n\nAddress changes are possible until the shipping label is printed. After that, the agent can request a carrier intercept only for a supervisor-approved fee.\n\nBefore cancelling an order, changing its address or discussing its details, verify the requester under SOP-1. If the request comes from an email address that is not on the order, ask for the billing ZIP code to verify along with the\norder number.\n\nAsk why the customer wants to cancel; duplicates are common. If the customer placed the same order twice, confirm which order to keep before cancelling anything.\n\nCancelling a Processing order voids the card authorization; the customer is not charged, and the pending authorization disappears from their statement within a few days depending on their bank.\n\nDo not quote internal warehouse system statuses or host names. Explain whether the change was possible and what\nhappens next."
   },
   {
    "id": "KB-7",
    "title": "Price adjustments and promo codes",
    "body": "If the price of an item on fernwood.com drops within 14 days of purchase, the customer can request a price adjustment for the difference. Adjustments apply only to our own site price, not competitors'.\n\nThe adjustment is the difference between what the customer actually paid for the item (after any promo code or discount) and the current price. Ask when the order was placed and whether a promo code was used, then calculate the adjustment from the price paid. Example: an item bought at $100 with a 10% code was paid at $90; if it now costs $85, the adjustment is $5.\n\nRefund the adjustment to the original payment method. Adjustments up to $150 are within agent authority.\n\nOnly one promo code can be used per order, and codes cannot be added to an order after it is placed; a price adjustment is the way to give customers the benefit of a later sale.\n\nClearance and limited-time flash sales are eligible for adjustments within the same 14-day window.\n\nExplain the calculation to the customer in one sentence so they understand the amount."
   },
   {
    "id": "KB-8",
    "title": "Wrong item received",
    "body": "If a customer receives an item different from what they ordered (wrong product, size or color):\n1. Apologize; this is our error.\n2. Ask what the packing slip or the item label says (the item code) so the warehouse can trace the mistake, and whether the item is unused in its packaging.\n3. Ship the correct item immediately if it is in stock, with 2-day shipping at no cost.\n4. Email a prepaid return label for the wrong item; it should be returned within 30 days. There is no return fee.\n\nIf the correct item is out of stock, offer a refund or a similar item.\n\nDo not ask the customer to send the wrong item back before the replacement ships.\n\nDo not share warehouse station numbers, picker details or internal error reports with the customer (SOP-3); say that we picked the wrong item and that the warehouse has been told.\n\nThe order number is printed on the packing slip and in the confirmation email; do not ask for it again if the customer has already given it."
   },
   {
    "id": "KB-9",
    "title": "Backorders",
    "body": "A backordered item is not in stock; the order page shows an estimated ship date based on the supplier's expected delivery. Estimates can move, so they are always described as estimates (SOP-4).\n\nWhen a customer asks about a backorder:\n1. Give the current estimate and explain that it depends on the supplier.\n2. Ask whether they need the item by a specific date.\n3. Ask whether they would accept a similar in-stock alternative.\n\nOptions: wait for the backordered item; cancel the backordered line at any time for a full refund; or switch to an alternative. If the alternative costs more and the backorder is our responsibility, a supervisor may approve a no-cost upgrade; agents may not promise it before approval (SOP-2). If the alternative costs less, refund the\ndifference.\n\nDo not share supplier purchase order numbers or supplier ETAs from internal systems as firm dates.\n\nGive the customer a time by which you will update them while waiting for a supervisor decision."
   },
   {
    "id": "KB-10",
    "title": "Gift cards and store credit",
    "body": "Fernwood gift cards and store credit never expire and can be combined with one promo code per order.\n\nLost gift card codes can be reissued only to the original purchaser, with the order number of the gift card purchase or the email it was sent to. Customers who received a gift card as a present should ask the sender to contact us.\n\nStore credit issued as goodwill appears on the customer's account and is applied at checkout automatically. Agents may issue goodwill credit up to the SOP-2 limit; higher amounts need supervisor approval.\n\nGift cards cannot be refunded to a card or exchanged for cash, except where state law requires.\n\nIf a gift card was used fraudulently, escalate to the fraud team and do not discuss the investigation details with\nthe customer (SOP-3).\n\nBalance checks: customers can check balances on the gift card page; agents can confirm a balance after verifying the\nrequester under SOP-1.\n\nPhysical gift cards that arrive damaged can be replaced with the card number printed on the back."
   }
  ],
  "sop": [
   {
    "id": "SOP-1",
    "title": "Order verification",
    "body": "Before cancelling, changing the address on, refunding or discussing details of an order, check that the requester's email matches the order email. If it does not, ask for the order number and the billing ZIP code and verify both before acting. Record verification in an internal note."
   },
   {
    "id": "SOP-2",
    "title": "Refund and compensation authority",
    "body": "Agents may refund up to $150 per order without a return, issue full refunds after a return is received, and give goodwill store credit up to $25. Anything above these limits, no-cost upgrades, and refunds outside policy need supervisor approval before the customer is told an amount or outcome."
   },
   {
    "id": "SOP-3",
    "title": "Confidentiality",
    "body": "Do not share internal notes, warehouse system names or host names, warehouse station or picker details, carrier scan or GPS data, internal queue or hold codes, trace, claim or RMA reference numbers, supplier purchase orders, or fraud review details with customers. Never share another customer's information."
   },
   {
    "id": "SOP-4",
    "title": "Commitments",
    "body": "Never guarantee delivery dates or carrier outcomes; give carrier or supplier estimates as estimates. One reship per order without supervisor approval."
   },
   {
    "id": "SOP-5",
    "title": "Tone",
    "body": "Friendly, warm and concise. Apologize when Fernwood is at fault. Never blame the customer or the carrier dismissively, and never tell a customer to \"relax\" or \"be patient\" instead of acting. Do not ask for information the customer has\nalready provided."
   }
  ],
  "tickets": [
   {
    "key": "CS-9101",
    "request_type": "Delivery",
    "summary": "Marked delivered but not here",
    "created": "2026-10-13T16:20:00Z",
    "customer": {
     "name": "Jenna Morales",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Jenna Morales",
      "date": "2026-10-13T16:20:00Z",
      "public": true,
      "body": "Hi, my order FW-208841 (the Ridgeline 4P tent) says delivered yesterday at 2:14pm but there's nothing here. It was $389, I'm kind of panicking."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-10-13T16:23:00Z",
      "public": false,
      "body": "Requester email matches order email. Verified per SOP-1."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-10-13T16:28:00Z",
      "public": true,
      "body": "Hi Jenna, I'm sorry, that's stressful, but most packages marked delivered turn up within a day. Does your building have a mailroom or front office where carriers leave parcels? And could you check with your neighbors in case it was left with one of them? Ana"
     },
     {
      "from": "customer",
      "author": "Jenna Morales",
      "date": "2026-10-13T17:55:00Z",
      "public": true,
      "body": "I'm in an apartment, Building C has a package room. Checked it twice, and my neighbors haven't seen it either."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-10-13T18:01:00Z",
      "public": false,
      "body": "Carrier scan GPS: delivered 0.4 miles from address. Opened carrier claim CLM-55102. Reship allowed after 2 business days\nper KB-2."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-10-13T18:04:00Z",
      "public": true,
      "body": "Thanks for checking, Jenna. I've opened an investigation with the carrier. If the tent hasn't turned up by Thursday, we'll send you a replacement at no cost, or a full refund if you'd prefer. Just let me know which. Ana"
     },
     {
      "from": "customer",
      "author": "Jenna Morales",
      "date": "2026-10-13T18:30:00Z",
      "public": true,
      "body": "Replacement please, I need it for a trip."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-10-16T17:40:00Z",
      "public": true,
      "body": "There's still no sign of it, so I've shipped your replacement tent today. Tracking is in your email. Ana"
     }
    ],
    "resolution": "Checks done, carrier investigation (CLM-55102) opened; replacement shipped after 2 business days.",
    "kb_used": [
     "KB-2"
    ]
   },
   {
    "key": "CS-9114",
    "request_type": "Delivery",
    "summary": "Boots stuck in transit for over a week",
    "created": "2026-11-06T09:05:00Z",
    "customer": {
     "name": "Brian Osei",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Brian Osei",
      "date": "2026-11-06T09:05:00Z",
      "public": true,
      "body": "My order FW-209310 (Summit Trek boots) has said \"In transit\" with no update since Oct 28. It's Nov 6. Where are my boots?"
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-06T09:15:00Z",
      "public": true,
      "body": "Hi Brian, sorry about that, nine days without an update isn't normal. Do you need them by a particular date? If so, I can look at faster options for the replacement. Ana"
     },
     {
      "from": "customer",
      "author": "Brian Osei",
      "date": "2026-11-06T09:30:00Z",
      "public": true,
      "body": "Yes, I'm going to Zion on Nov 15 and need time to break them in."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-06T09:36:00Z",
      "public": false,
      "body": "No carrier scan since 10/28 at hub: lost per KB-3. Trace TR-7781 opened. In stock at RNO1; reship with 2-day shipping."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-06T09:39:00Z",
      "public": true,
      "body": "Thanks Brian. Since there's been no movement for more than 7 days, we're treating the package as lost. I've opened a trace with the carrier and sent a replacement pair with 2-day shipping at no cost; the carrier estimates delivery on Nov 10. If the original turns up, you can refuse it or send it back with a free label. Ana"
     },
     {
      "from": "customer",
      "author": "Brian Osei",
      "date": "2026-11-06T09:55:00Z",
      "public": true,
      "body": "Great, appreciate it."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-10T13:05:00Z",
      "public": true,
      "body": "Tracking shows your replacement boots were delivered today. Enjoy Zion! Ana"
     }
    ],
    "resolution": "No movement 9 days; treated as lost, trace TR-7781, replacement shipped 2-day from RNO1.",
    "kb_used": [
     "KB-3"
    ]
   },
   {
    "key": "CS-9120",
    "request_type": "Returns",
    "summary": "Refund for returned jacket not received",
    "created": "2026-11-12T14:40:00Z",
    "customer": {
     "name": "Alicia Nakamura",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Alicia Nakamura",
      "date": "2026-11-12T14:40:00Z",
      "public": true,
      "body": "I returned the Alder rain jacket from order FW-205577 three weeks ago and still haven't got my refund."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-12T14:52:00Z",
      "public": true,
      "body": "Hi Alicia, sorry for the wait. Could you send me the return tracking number, and let me know how you sent it back (drop-off location or pickup)? Joel"
     },
     {
      "from": "customer",
      "author": "Alicia Nakamura",
      "date": "2026-11-12T15:10:00Z",
      "public": true,
      "body": "Tracking is 1Z84E9A0312, I dropped it at the UPS Store on Pine St on Oct 24."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-12T15:16:00Z",
      "public": false,
      "body": "Return received at warehouse 10/30, stuck in QC-HOLD inspection queue. Released. Refund $156.00 - $7.95 label = $148.05."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-12T15:19:00Z",
      "public": true,
      "body": "Thanks Alicia. Your jacket reached our warehouse on Oct 30, but its inspection was delayed, which is our fault. I've pushed it through and issued your refund of $148.05 (the $156 price minus the $7.95 return label). It should show on your card within 5-7 business days. Joel"
     },
     {
      "from": "customer",
      "author": "Alicia Nakamura",
      "date": "2026-11-12T16:00:00Z",
      "public": true,
      "body": "Thanks, I see it pending already."
     }
    ],
    "resolution": "Return received 10/30 but held in inspection (QC-HOLD); released and refunded $148.05.",
    "kb_used": [
     "KB-4"
    ]
   },
   {
    "key": "CS-9128",
    "request_type": "Damaged item",
    "summary": "Cooler arrived with cracked lid",
    "created": "2026-10-22T18:10:00Z",
    "customer": {
     "name": "Derek Huang",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Derek Huang",
      "date": "2026-10-22T18:10:00Z",
      "public": true,
      "body": "The Glacier 45 cooler from order FW-207702 arrived today and the lid is cracked right across. Not happy for $249."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-10-22T18:19:00Z",
      "public": true,
      "body": "Hi Derek, I'm really sorry it arrived like that. Could you send a couple of photos of the crack and of the outside of the box? And was the box damaged too? Joel"
     },
     {
      "from": "customer",
      "author": "Derek Huang",
      "date": "2026-10-22T18:50:00Z",
      "public": true,
      "body": "Photos attached (IMG_4471, IMG_4472). Yes, one corner of the box was crushed."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-10-22T18:56:00Z",
      "public": false,
      "body": "Shipping damage, item over $75: replacement + free return label. RMA-3318. Carrier damage claim 8812 filed."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-10-22T18:59:00Z",
      "public": true,
      "body": "Thanks for the photos, Derek. That's shipping damage. I've sent a replacement cooler today and emailed you a free return label for the damaged one; please send it back within 30 days. Sorry again. Joel"
     },
     {
      "from": "customer",
      "author": "Derek Huang",
      "date": "2026-10-22T19:20:00Z",
      "public": true,
      "body": "OK, appreciate the quick replacement."
     }
    ],
    "resolution": "Photos confirmed shipping damage; replacement sent (RMA-3318) with free return label; carrier claim 8812.",
    "kb_used": [
     "KB-5"
    ]
   },
   {
    "key": "CS-9133",
    "request_type": "Order change",
    "summary": "Change shipping address to office",
    "created": "2026-11-03T08:30:00Z",
    "customer": {
     "name": "Sam Whitfield",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Sam Whitfield",
      "date": "2026-11-03T08:30:00Z",
      "public": true,
      "body": "Can you change the shipping address on order FW-210044 to my office? I'll be away when it arrives. Office is 500 Market St, Suite 1200, Portland."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-03T08:37:00Z",
      "public": true,
      "body": "Hi Sam, happy to try. This email isn't the one on the order, so to protect the order I need to verify it first: what's the billing ZIP code on the order? And which email address did you order with? Ana"
     },
     {
      "from": "customer",
      "author": "Sam Whitfield",
      "date": "2026-11-03T08:50:00Z",
      "public": true,
      "body": "Billing ZIP is 97214. I ordered with my personal Gmail, this is my work address."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-03T08:55:00Z",
      "public": false,
      "body": "Verified: order number + billing ZIP match (SOP-1). wms-pdx-01 shows label not yet printed; address change possible."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-03T08:58:00Z",
      "public": true,
      "body": "Thanks Sam, you're verified. The order hadn't shipped yet, so I've updated the shipping address to 500 Market St, Suite 1200. The tracking email will go to your personal Gmail when it ships. Ana"
     },
     {
      "from": "customer",
      "author": "Sam Whitfield",
      "date": "2026-11-03T09:05:00Z",
      "public": true,
      "body": "Perfect, thanks!"
     }
    ],
    "resolution": "Verified via order number + billing ZIP; address changed before label printed.",
    "kb_used": [
     "KB-6"
    ]
   },
   {
    "key": "CS-9140",
    "request_type": "Wrong item",
    "summary": "Received wrong daypack",
    "created": "2026-10-29T12:15:00Z",
    "customer": {
     "name": "Fatima Noor",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Fatima Noor",
      "date": "2026-10-29T12:15:00Z",
      "public": true,
      "body": "I ordered the Trailhead 30L daypack in Slate (order FW-209988) and got a completely different bag. It's smaller and red."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-10-29T12:23:00Z",
      "public": true,
      "body": "Hi Fatima, sorry about the mix-up! Could you tell me what the item code on the packing slip or the bag's label says? And is the bag still unused in its packaging? Joel"
     },
     {
      "from": "customer",
      "author": "Fatima Noor",
      "date": "2026-10-29T12:39:00Z",
      "public": true,
      "body": "Packing slip says DP-20-RED. It's still in the plastic, I haven't used it."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-10-29T12:44:00Z",
      "public": false,
      "body": "Pick error at station 14. 30L Slate in stock; replacement order FW-210311 shipped 2-day. Warehouse notified."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-10-29T12:47:00Z",
      "public": true,
      "body": "Thanks Fatima, we sent the wrong item, sorry. I've shipped the 30L in Slate today with 2-day shipping, and emailed you a prepaid label to send the red one back within 30 days. Joel"
     },
     {
      "from": "customer",
      "author": "Fatima Noor",
      "date": "2026-10-29T13:00:00Z",
      "public": true,
      "body": "Thanks for sorting it so fast."
     }
    ],
    "resolution": "Pick error; correct daypack shipped 2-day (FW-210311) with prepaid return label.",
    "kb_used": [
     "KB-8"
    ]
   },
   {
    "key": "CS-9147",
    "request_type": "Price adjustment",
    "summary": "Sleeping bag price dropped after purchase",
    "created": "2026-11-07T19:45:00Z",
    "customer": {
     "name": "Tom Reyes",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Tom Reyes",
      "date": "2026-11-07T19:45:00Z",
      "public": true,
      "body": "I bought the Cascade 15 sleeping bag for $219 and now it's $179 on your site. Can I get the difference back?"
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-07T19:51:00Z",
      "public": true,
      "body": "Hi Tom, good catch. We do price adjustments within 14 days of purchase. When did you place the order, and did you use a promo code at checkout? Ana"
     },
     {
      "from": "customer",
      "author": "Tom Reyes",
      "date": "2026-11-07T20:07:00Z",
      "public": true,
      "body": "Ordered Nov 2. Yes, I used FALL10."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-07T20:12:00Z",
      "public": false,
      "body": "FALL10 = 10% off, paid $197.10. Current $179.00, adjustment $18.10. Ref PA-4410."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-07T20:15:00Z",
      "public": true,
      "body": "Thanks Tom. With FALL10 you paid $197.10, so the difference to today's price is $18.10. I've refunded $18.10 to your original payment method; it'll show within 3-5 business days. Ana"
     },
     {
      "from": "customer",
      "author": "Tom Reyes",
      "date": "2026-11-07T20:29:00Z",
      "public": true,
      "body": "Ah right, the code. Fair enough, thanks."
     }
    ],
    "resolution": "Price adjustment of $18.10 calculated from price paid after FALL10 (PA-4410).",
    "kb_used": [
     "KB-7"
    ]
   },
   {
    "key": "CS-9153",
    "request_type": "Cancellation",
    "summary": "Cancel order",
    "created": "2026-11-09T10:50:00Z",
    "customer": {
     "name": "Olu Bankole",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Olu Bankole",
      "date": "2026-11-09T10:50:00Z",
      "public": true,
      "body": "Please cancel order FW-210502 asap. Writing from my work email."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-09T10:55:00Z",
      "public": true,
      "body": "Hi Olu, I can help. Since this email isn't the one on the order, could you confirm the billing ZIP code? And may I ask why you'd like to cancel, in case there's something else we can fix? Joel"
     },
     {
      "from": "customer",
      "author": "Olu Bankole",
      "date": "2026-11-09T11:04:00Z",
      "public": true,
      "body": "ZIP 60614. I ordered twice by accident, I want to keep FW-210498."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-09T11:08:00Z",
      "public": false,
      "body": "Verified order number + ZIP. FW-210502 not yet released to warehouse; cancelled, payment authorization voided."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-09T11:10:00Z",
      "public": true,
      "body": "Thanks Olu, you're verified. I've cancelled FW-210502; FW-210498 is unaffected and will ship as normal. You weren't charged for the cancelled order, and the pending authorization will drop off your card within a few days. Joel"
     },
     {
      "from": "customer",
      "author": "Olu Bankole",
      "date": "2026-11-09T11:20:00Z",
      "public": true,
      "body": "Great, thanks."
     }
    ],
    "resolution": "Duplicate order verified and cancelled before release; authorization voided.",
    "kb_used": [
     "KB-6"
    ]
   },
   {
    "key": "CS-9160",
    "request_type": "Backorder",
    "summary": "Backordered paddle - when will it ship?",
    "created": "2026-11-04T13:00:00Z",
    "customer": {
     "name": "Henrik Larsen",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Henrik Larsen",
      "date": "2026-11-04T13:00:00Z",
      "public": true,
      "body": "My order FW-206120 says the Torrent kayak paddle is backordered. When will it actually ship?"
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-04T13:09:00Z",
      "public": true,
      "body": "Hi Henrik, sorry for the wait. Our current estimate is mid-December, but it depends on our supplier. Do you need it by a certain date? And would you be open to a similar paddle that's in stock? Ana"
     },
     {
      "from": "customer",
      "author": "Henrik Larsen",
      "date": "2026-11-04T13:40:00Z",
      "public": true,
      "body": "I need it for a river trip on Dec 6. The carbon one is fine if it's not crazy expensive."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-04T13:46:00Z",
      "public": false,
      "body": "Supplier PO-88412 ETA Dec 10, too late for customer. Torrent Pro carbon is $40 more. Asked supervisor for a no-cost upgrade."
     },
     {
      "from": "agent",
      "author": "Ana",
      "date": "2026-11-04T13:49:00Z",
      "public": true,
      "body": "Thanks Henrik. The estimate for the original is later than your trip, so I've asked my supervisor whether we can switch you to the carbon model at no extra cost. I'll update you by tomorrow afternoon. Ana"
     },
     {
      "from": "agent",
      "author": "Marisol",
      "date": "2026-11-05T10:40:00Z",
      "public": true,
      "body": "Hi Henrik, Marisol here, Customer Care supervisor. Approved: we're switching you to the Torrent Pro carbon paddle as a no-cost upgrade. It ships today with 2-day delivery."
     },
     {
      "from": "customer",
      "author": "Henrik Larsen",
      "date": "2026-11-05T11:20:00Z",
      "public": true,
      "body": "Fantastic, thank you!"
     }
    ],
    "resolution": "Backorder ETA after trip; supervisor approved no-cost upgrade to carbon paddle.",
    "kb_used": [
     "KB-9"
    ]
   },
   {
    "key": "CS-9168",
    "request_type": "Returns",
    "summary": "Backpack zipper broke - want to return",
    "created": "2026-11-11T11:25:00Z",
    "customer": {
     "name": "Carla Mendes",
     "role": "Customer"
    },
    "thread": [
     {
      "from": "customer",
      "author": "Carla Mendes",
      "date": "2026-11-11T11:25:00Z",
      "public": true,
      "body": "I want to return the Basin 40 backpack I bought in August, the main zipper broke and won't close."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-11T11:35:00Z",
      "public": true,
      "body": "Hi Carla, sorry the zipper failed. When did you buy it, and how much have you used it? Could you also send a photo of the\nzipper? Joel"
     },
     {
      "from": "customer",
      "author": "Carla Mendes",
      "date": "2026-11-11T12:00:00Z",
      "public": true,
      "body": "Order date August 18, I've used it on two trips. Photo attached."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-11T12:06:00Z",
      "public": false,
      "body": "Day 85, outside the 60-day return window. Zipper failure = manufacturing defect, 1-year warranty (KB-5). Warranty claim\nWC-2290; replacement shipped."
     },
     {
      "from": "agent",
      "author": "Joel",
      "date": "2026-11-11T12:09:00Z",
      "public": true,
      "body": "Thanks Carla. It's past the 60-day return window, but a zipper failing like this is a manufacturing defect, and those are covered by our 1-year warranty. I've sent you a replacement Basin 40 and emailed a prepaid label for the broken one.\nJoel"
     },
     {
      "from": "customer",
      "author": "Carla Mendes",
      "date": "2026-11-11T12:25:00Z",
      "public": true,
      "body": "Oh great, I thought I was out of luck. Thanks!"
     }
    ],
    "resolution": "Handled as warranty defect (WC-2290) despite being past the return window; replacement sent.",
    "kb_used": [
     "KB-5"
    ]
   }
  ]
 }
];

export const packById = (id) => PACKS.find((p) => p.id === id);
