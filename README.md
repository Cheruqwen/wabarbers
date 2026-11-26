# PitStop 87

Online booking and records for the car wash, carpet cleaning, car service, kinyozi and nail parlour. It includes valet pickups and drop-offs, memberships, and an approval step for each staff role. Gas, water and laundry are already built in and are switched off until you're ready.

There are three parts:

| Part | Address | Who uses it |
|---|---|---|
| Booking page | `yourdomain/` | Anyone. Customers pick services, a time and pickup, then get a code and a live tracking link. |
| Customer page | `yourdomain/#me/…` (a private link you send them) | Customers and members. Shows their bookings, membership card with visits left, cars, history and "Book again". |
| Staff app | `yourdomain/staff/` | Your team, each person signed in with their phone number and a PIN. |

---

## 1. Test it on your laptop first

This runs the whole system on your laptop, including the database, sign-in and photos. Phones on the same Wi-Fi can join in, so the team can test together with shared data. No Supabase account or internet hosting is needed yet.

**You need** Node.js 18 or newer (check with `node -v`; download from nodejs.org).

```
cd pitia-pitstop
npm install          # once
npm run demo         # starts with a sample day and demo sign-ins
```

The terminal then shows two addresses:

- **On the laptop:** `http://localhost:8080` for the booking page and `http://localhost:8080/staff/` for the staff app.
- **On phones on the same Wi-Fi:** something like `http://192.168.1.20:8080/staff/`. If the laptop asks whether to allow incoming connections, say yes for private networks.

**Demo sign-ins** all use PIN `123456`:

| Phone | Who | Role |
|---|---|---|
| 0700 000 001 | Owner | Owner (sees everything) |
| 0700 000 002 | Kamau | Manager for car wash, carpets and car service |
| 0700 000 003 | Baraka | Barber |
| 0700 000 004 | Naliaka | Nail tech |
| 0700 000 005 | Otieno | Washer |
| 0700 000 006 | Juma | Rider / valet |
| 0700 000 007 | Investor | Financier (reports only) |

Sign in as different people on different phones at the same time. A booking made on the booking page shows up on the staff board within 20 seconds.

**Other commands:**

| Command | What it does |
|---|---|
| `npm start` | Runs with your existing data. On a fresh start it's empty, like launch day, and the first person to join becomes the owner. |
| `npm run reset` | Deletes all local data so you can start over. |
| `npm start -- --port=8081` | Uses another port if 8080 is busy. |
| `npm test` | Runs the permission checks. |

Everything is saved in the `local-data` folder. Stop the server with Ctrl+C. Your data is still there when you start it again.

Over the Wi-Fi address, phones block a few features that need a secure (https) connection: **Share my location** on the booking page, and some **Copy** buttons. Everything works once the site is online with https. On the laptop itself (`localhost`) everything works.

### Quick look without installing anything

If the site is opened without the local server and without Supabase, for example once it's on GitHub Pages, it runs in **demo mode**. Each phone or computer gets its own private sample day, and nothing is shared between devices. Open `staff/` and pick a person to see their view. **Reset demo** in the yellow bar brings the sample day back.

## Who can do what

| Role | Sees | Can do |
|---|---|---|
| **Owner** (super admin) | Everything | Prices, plans, pickup areas, approve staff and set roles, reset PINs, profit report |
| **Department manager** | Their departments only | Book, assign, change prices and discounts, cancel, sell memberships, log expenses, see their sales |
| **Attendant** (washer, barber, nail tech) | Jobs assigned to them, plus unassigned jobs in their department | Book walk-ins, move jobs along, pickup checks, take payments, see their own commission |
| **Rider / valet** | Their runs, plus runs nobody has taken | Take runs, "On my way", pickup check, "Delivered", collect cash |
| **Financier** | Reports only | Sales, collections, expenses and profit, with no customer names or numbers |
| **Customer** | Their private page and tracking links | Book again, see membership visits left, history, cancel before work starts |
| **Logged-out visitor** | The booking page | Book with name and phone, track the booking |

These rules are enforced by the database itself, not only by the screens. Every action goes through a function that first checks who is signed in. The `dev/` folder has 100 automated checks, one role at a time, so a developer can confirm this after any change.

---

## 2. Go live (about 30–45 minutes)

### 2.1 Put the site online (GitHub Pages, free)

1. Create a free account at github.com, then create a **new repository** (for example `pitstop`). Make it **Public**, which GitHub Pages needs on a free account.
2. Click **Add file → Upload files** and drag in **everything inside this folder**, including the `assets`, `staff` and `supabase` folders. Leave out `node_modules` and `local-data` if you've run the laptop version, because they're large and only for your laptop. Click **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment" choose **Deploy from a branch**, pick **main** and **/ (root)**, then click **Save**.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/pitstop/`. It opens in demo mode.

### 2.2 Use your own domain

In the repository go to **Settings → Pages → Custom domain**, enter the address you want and click **Save**. Then add a record where your domain's DNS is managed (your registrar):

- **For a subdomain**, like `book.yourdomain.co.ke` (easiest): add a **CNAME** record for `book` pointing to `YOUR-USERNAME.github.io`.
- **For the main domain**, like `yourdomain.co.ke`: add four **A** records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`.

When the check passes, tick **Enforce HTTPS**. DNS changes can take a few hours, and occasionally up to a day.

### 2.3 Create the database (Supabase, free)

1. Sign up at supabase.com and create a **New project**. Pick a region close to Kenya, such as one in Europe, and save the database password somewhere safe.
2. Open **SQL Editor → New query**. Paste the whole of `supabase/schema.sql`, then click **Run**. You should see "Success". It's safe to run again after future updates, and it keeps your data.
   - **Don't** run `demo-shim.sql` or `demo-seed.sql` there. They're only for demo mode.
3. Go to **Authentication → Sign In / Providers → Email**. Turn **off "Confirm email"** and save. Staff sign in with phone and PIN, so no emails are needed.
4. Find your keys: click **Connect** at the top of the project, or go to **Project Settings → API Keys**. Copy the **Project URL** and the **anon / publishable** key. Never use the **service_role / secret** key in the website.

### 2.4 Connect the site

Edit `config.js` on GitHub (open the file, click the pencil, then **Commit changes**):

```js
supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
supabaseAnonKey: 'YOUR-ANON-OR-PUBLISHABLE-KEY',
loginDomain: 'staff.yourdomain.co.ke',
siteUrl: 'https://book.yourdomain.co.ke/'
```

- `loginDomain` is only an internal login name and no emails go there. Set it once, and don't change it after staff have joined.
- `siteUrl` is the address used in links you send to customers.

You can still open the demo at any time by adding `?demo` to the address, for example `…/staff/?demo`.

### 2.5 Become the owner, then add your team

1. **Go first.** Open `yourdomain/staff/`, tap **New here? Join the team**, and join with your phone number and a 6-digit PIN. **The first person to join becomes the Owner.**
2. Send the staff link to your team. When they join, they appear under **Manage → Team → Waiting for approval**. Tap **Approve**, pick their role and department, and set their commission.
3. Each person opens the staff link on their phone and taps **Add to Home Screen**, so it works like an app.
4. If someone forgets their PIN, open them in **Manage → Team**, set a new PIN, and tell them in person.

### 2.6 Set up the business

In **Manage → Prices & settings**:

- **Business name, WhatsApp number and M-Pesa details.** These appear on the booking page, receipts and messages.
- **Departments.** Rename them (for example to your new shop names) and switch lines on or off. Gas, Water and Laundry start as "Coming soon".
- **Carpets: KSh 15 per square foot.** On the booking page the customer types the length × width of each piece in feet, and the price is worked out from the total area (for example 5×7 + 8×10 = 115 sq ft = KSh 1,725). Staff can correct the area on the job after measuring at pickup. The old fixed sizes (Small, Medium, Large) are kept switched off so past bookings still show them.
- **Coming soon: sofas and mattresses.** "Sofa · per seat" (400) and "Mattress" (1,000) are saved under Carpets but switched off, and the booking page says "Sofas and mattresses coming soon." When you're ready, tick **On** next to each one, rename the department (for example "Carpets & sofas"), and ask a developer to remove "coming soon" from the carpet description in `assets/public.js`.
- **Prices.** The starting prices are placeholders. Set yours. A price of 0 means "quote on inspection".
- **Membership plans.** Seven example plans are included, each 4 visits a month for about 12% off: Wash Club for small cars (700), normal cars (900) and Land Cruisers (1,400), Boda Club (350), and Kinyozi Club for a simple cut (500), a fade (700) or an executive cut (1,400). Members who joined an older plan keep what they paid for until it ends. Change or remove them. A service named like "Full wash · Small car" shows on the booking page as "Small car" under a "Full wash" heading.
- **Pickup areas and fees.** These start at 0. The fee is charged once per booking.

In **Manage → Links**, copy the booking link for your Instagram and TikTok bios, WhatsApp Business profile and roadside signs.

---

## 3. How a day works

1. **A booking comes in** from the website, or staff log a WhatsApp booking or walk-in with **+ New booking**. Website bookings show as **New** until someone taps **Confirm**, which also prepares the WhatsApp confirmation with a tracking link.
2. **Runs** groups pickups and drop-offs by area. The rider taps **Take this run**, then **On my way**, then **Collected**, which opens the **pickup check**: fuel, mileage, existing marks, keys and photos. For carpets, each piece gets a tag number like `T0042`.
3. **The attendant** taps the next step: **Start wash**, then **Mark ready**. Each tap is timed and shows on the customer's tracking page.
4. **Payment.** Tap **Record payment**, choose M-Pesa, cash, card or bank, and enter the M-Pesa code. A code that's already been used is blocked. One payment can cover a whole booking, such as a wash and a haircut together.
5. **Done.** Unpaid finished jobs stay on **Owed** until they're cleared.
6. **Reports** show sales, collections, expenses, profit, busiest hours, pickup areas and each person's commission. You can download them as a spreadsheet (CSV).

**Memberships.** Start one from the customer's page. Covered services are automatically priced at 0 when booked, the free-pickup perk removes the pickup fee, and visits left are counted on their customer page.

**Items.** Cars are saved from bookings by number plate. Carpets can be saved at the pickup check. Each saved item keeps its own service history.

---

## 4. Good to know

- **Cost.** GitHub Pages is free. Supabase's free plan includes a 500 MB database and 1 GB of photo storage, which is plenty for testing and early months. **Free Supabase projects pause after a week with no activity.** You restore them from the dashboard with one click. Upgrade when you go fully live so it never pauses.
- **Photos** are compressed on the phone before upload, and only signed-in staff can view them.
- **Customer links are private.** Anyone with a customer's link can see that customer's page, so send it only to their own WhatsApp. If one leaks, open the customer and tap **Reset their private link**.
- **Backups.** Supabase keeps daily backups on paid plans. On the free plan, download reports regularly.
- **Updates.** When you receive new versions of these files, upload them to GitHub the same way, then run the new `schema.sql` in Supabase. Your data stays.

## 5. Next upgrades

- **M-Pesa payment prompts (STK push)** through Safaricom Daraja. This needs a Till or Paybill and a small server function (Supabase Edge Functions), and payments would then mark themselves paid.
- **Automatic SMS or WhatsApp notifications** when status changes (Africa's Talking, or the WhatsApp Business API).
- **Customer login by SMS code**, so customers can sign in without a private link.
- **Live updates** instead of the 20-second refresh on the staff board.

## Files

```
index.html            booking page, tracker and customer page
staff/index.html      staff app
config.js             your Supabase address and key (edit this)
assets/               styles and code
supabase/schema.sql   the database: run this in Supabase
supabase/demo-*.sql   demo mode only (don't run in Supabase)
server/local.mjs      the laptop test server (npm run demo / npm start)
package.json          commands and the two libraries the laptop server needs
dev/                  permission tests for developers (not needed to run the site)
local-data/           created by the laptop server; your test data (not uploaded)
```
