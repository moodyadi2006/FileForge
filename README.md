# 🗜️ FileForge – File Compression & Decompression Portal

**FileForge** is a powerful full-stack web application that allows users to upload files, apply **lossless data compression algorithms**, and download the processed output. With a user-friendly interface and analytical insights, FileForge makes it easy to understand how different compression techniques reduce file size and processing time.

---

## 🔍 Objective

To design and develop an interactive web platform where users can:

- Upload text, image, or binary files.
- Compress and decompress files using popular lossless algorithms:
  - **Huffman Encoding (HE)**
  - **Run-Length Encoding (RLE)**
  - **LZ77**
- View and compare **algorithm-specific metrics** like:
  - Compression ratio
  - Processing time
  - Byte frequency
  - Unique bytes
- Securely sign up and authenticate via Google or email.
- Download processed files with a single click.

---

## 🚀 Live Deployments

- 🌐 **Frontend (Next.js)**: Deployed on [FileForge](https://file-forge-jitg.vercel.app)
- 🔗 **Backend (FastAPI)**: Deployed on [Render.com](https://fileforge-backend-s3xy.onrender.com)

---

## ⚙️ Tech Stack

| Layer            | Technology                         |
|------------------|------------------------------------|
| Frontend         | **Next.js**, **Tailwind CSS**      |
| Backend          | **FastAPI**                        |
| Algorithms       | Huffman Coding, RLE, LZ77          |
| Auth             | Google OAuth via **NextAuth.js**   |
| Email Services   | **Resend.com** (verification mails)|
| Charts           | **Chart.js** (data visualization)  |
| Deployment       | Vercel (Frontend) + Render (Backend)|

---

## 🔐 Authentication & Security

- 🔐 **Google OAuth** using `NextAuth.js`
- 📩 **Email-based signup** with verification handled via [Resend.com](https://resend.com)
- 🔄 Session handling and route protection implemented using secure NextAuth configuration

---

## 📊 Metrics & Analytics

Each algorithm has distinct metrics for both **compression** and **decompression**:

### 📌 Huffman Coding
- Compression Ratio
- Frequency Table
- Bitstream Length
- Most Frequent Byte

### 📌 Run-Length Encoding (RLE)
- Run Length Count
- Repeated Character Analysis
- Size Before/After Compression
- Encoding Efficiency

### 📌 LZ77
- Match Length Distribution
- Window Size Usage
- Offset Count
- Symbol Table

All of these metrics are visualized using **Chart.js** with responsive and interactive charts to enhance user understanding.

---

## 🔑 Key Features

- **📤 Upload Any File** (text, image, binary)
- **⚙️ Algorithm Selection**: Choose between HE, RLE, or LZ77
- **📉 Compression Stats**: View original size, compressed size, processing time, and ratio
- **📊 Real-time Charts**: Compare algorithm performance visually via Chart.js
- **📥 Download Button**: One-click download of compressed/decompressed output
- **📚 Algorithm Info**: Short technical explanations for each method
- **📧 Signup/Login**:
  - Google Auth (NextAuth)
  - Email-based OTP with Resend.com
- **🚫 Robust Error Handling**:
  - Invalid file formats
  - Corrupted input files
  - Algorithm-specific decompression failures
- **📱 Responsive UI** for all screen sizes

---

## 📁 Folder Structure

```

FileForge/
│
├── frontend/             # Next.js app with Tailwind + Chart.js
│   ├── src/
|       ├── app/
│       ├── components/
|       ├── context/
|       ├── helpers/
│       ├── lib/             
│       └── public/
│
├── backend/              # FastAPI backend
│   ├── utils/       # Huffman, RLE, LZ77 implementations
│   └── serve.py

````

---

## 🎨 Interface Walkthrough

Here’s a visual overview of how FileForge works:

## Home Page
![image](https://github.com/user-attachments/assets/6f587fc3-b802-4faa-8382-11dad87d85a5)

## Signup Page
![image](https://github.com/user-attachments/assets/14d1d913-bf97-48af-a3d4-4044ada60edb)

### Login Page
![image](https://github.com/user-attachments/assets/02f932b1-6883-49b6-a8f7-b35b51e84394)

### 🧭 Upload and Select Algorithm
![image](https://github.com/user-attachments/assets/427ee1c1-237f-4bfb-a2aa-9334884d8ed6)

### 📊 Compression Stats and Charts
![image](https://github.com/user-attachments/assets/493fab3d-4e64-4205-a734-afeda6914d59)
![image](https://github.com/user-attachments/assets/7e77bff6-d1a7-4094-ad47-7e1e19019306)

### 📥 Download Processed File
![image](https://github.com/user-attachments/assets/22cdc375-5afa-4906-9257-f6f5f2fd28cd)

### 📊 Decompression Stats and Charts
![image](https://github.com/user-attachments/assets/67a74062-9fc1-4095-b863-322a54605eeb)
![image](https://github.com/user-attachments/assets/a08f5517-6644-4629-8dd8-08d947be4271)

### 📥 Download Processed File
![image](https://github.com/user-attachments/assets/16fa9f93-4f16-4125-bd4b-07c8801d611d)

---

## 🧪 Local Setup Instructions

### 1. 🔧 Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
````

#### 🔐 Backend `.env` file (inside `/backend/.env`)

```env
NEXTAUTH_SECRET = "your-next-auth-secret"
GOOGLE_CLIENT_ID = "your-google-client-id"
```

---

### 2. 💻 Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

#### 🌍 Frontend `.env.local` file (inside `/frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
RESEND_API_KEY=your_resend_api_key
MONGODB_URI=your_mongodb_uri
```

---

## 📦 Future Improvements

* Add support for ZIP, GZIP, and BWT compression
* Batch upload & multi-file compression
* Export analytics in CSV/PDF formats
* Save the compressed/decompressed files in DB

---

## 🙋 About the Developer

**Name**: Aditya Kumar
**Mobile**: +91 9540492006
**Email**: [moodyadi30@gmail.com](mailto:moodyadi30@gmail.com)

---
