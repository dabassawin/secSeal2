# 📘 เอกสาร Master API Reference — ระบบ SecSeal

> **ภาพรวม:** เอกสารรวม API ทั้งหมดของโปรเจค PEAsecSeal อ้างอิงจาก Source Code จริง
> **Base URL:** `http://<server-ip>:3000`

---

## สารบัญ
1. [ระบบยืนยันตัวตน (Auth)](#1-ระบบยืนยันตัวตน-auth-ทั่วไป)
2. [ผู้ใช้งานระบบหลังบ้าน (Users)](#2-ผู้ใช้งานระบบหลังบ้าน-users)
3. [ระบบจัดการซีล (Seals)](#3-ระบบจัดการซีล-seals)
4. [ระบบช่างเทคนิค (Technician)](#4-ระบบช่างเทคนิค-technician)
5. [บันทึกการใช้งานระบบ (Logs)](#5-บันทึกการใช้งานระบบ-logs)
6. [รายงาน (Reports)](#6-รายงาน-reports)
7. [ข้อมูลพื้นฐานองค์กร (MasCom)](#7-ข้อมูลพื้นฐานองค์กร-mascom)
8. [ข้อมูลการไฟฟ้า (MasPea)](#8-ข้อมูลการไฟฟ้า-maspea)
9. [สแกนซีลสาธารณะ (Public Seal Scan)](#9-สแกนซีลสาธารณะ-public-seal-scan)

---

## 1. ระบบยืนยันตัวตน (Auth ทั่วไป)
ใช้สำหรับ Admin และ User ทั่วไปในการยืนยันตัวเข้าใช้งานระบบ Web Application
- **`POST` /api/auth/login** - เข้าสู่ระบบสำหรับ User / Admin (ส่ง `username`, `password`)

---

## 2. ผู้ใช้งานระบบหลังบ้าน (Users)
การจัดการรายละเอียด User ภายในระบบ (ต้องใช้ Header `Authorization: Bearer <token>`)

- **`GET` /api/users/** - ดึงรายชื่อผู้ใช้งานทั้งหมด
- **`GET` /api/users/:username** - ดึงข้อมูลผู้ใช้ตาม Username
- **`POST` /api/users/** - สร้างผู้ใช้งานใหม่
- **`PUT` /api/users/:username** - อัปเดตข้อมูลผู้ใช้งานตาม Username
- **`DELETE` /api/users/:username** - ลบผู้ใช้งาน

---

## 3. ระบบจัดการซีล (Seals)
การจัดการวงจรชีวิตของซีล ตั้งแต่เริ่มต้น สร้าง จ่าย ใช้งาน และคืนวงบบ

- **`GET` /api/seals/** - ดึงข้อมูลซีลทั้งหมด
- **`POST` /api/seals/** - สร้างซีลจำนวนตามที่ระบุ (ระบุเลขเริ่มต้น)
- **`POST` /api/seals/generate** - [Admin] ทำการ generate seals
- **`POST` /api/seals/generate-batches** - [Admin] ทำการ generate seals จำนวนหลาย batches พร้อมกัน
- **`PUT` /api/seals/:seal_number/assign** - กำหนดมอบหมาย (assign) ซีลให้กับช่างเทคนิค
- **`POST` /api/seals/scan** - ตรวจสอบซีลผ่านการยิงบาร์โค้ด
- **`GET` /api/seals/report** - ดูรายงานสรุปสถานะการใช้ซีล (จำนวนแต่ละสถานะ)
- **`GET` /api/seals/statement** - ดึงรายงานรายการความเคลื่อนไหว (Statement) ของซีลตามช่วงเวลา
- **`GET` /api/seals/check** - ตรวจสอบความพร้อมของหลายๆ ซีลผ่าน Query parameters
- **`POST` /api/seals/check** - ตรวจสอบความพร้อมของหลายๆ ซีลแยกตามรหัสผ่าน JSON Body
- **`GET` /api/seals/check/:seal_number** - ตรวจสอบว่าซีลมีอยู่ในระบบหรือไม่
- **`POST` /api/seals/issue-multiple** - การจ่ายซีลให้ช่างในจำนวนมาก (Bulk-issue)
- **`GET` /api/seals/status/:status** - ค้นหาซีลตามสถานะที่กำหนด (เช่น `พร้อมใช้งาน`, `จ่าย`)
- **`GET` /api/seals/pending-returns** - ดึงรายการซีลที่อยู่ระหว่างรอการอนุมัติการคืนซีล
- **`GET` /api/seals/:id/status/:status** - ค้นหาซีลผ่าน ID และสถานะที่กำหนดไว้
- **`PUT` /api/seals/:seal_number/issue** - แจ้งอนุมัติจ่าย (Issue) ซีล (เฉพาะ Admin)
- **`PUT` /api/seals/:seal_number/use** - แจ้งการใช้/ติดตั้งซีลที่หน้างาน (พร้อมอ้างอิงรหัสเครื่องมือ)
- **`PUT` /api/seals/:seal_number/return** - แจ้งคืนซีล (หลังจากใช้งานหรือถูกยกเลิกแล้วส่งคืน)
- **`GET` /api/seals/:seal_number/logs** - เรียกดูประวัติ (Log) ของรหัสซีลนั้นๆ
- **`GET` /api/seals/:seal_number** - ดึงข้อมูลรายละเอียดของซีลระบุเป็นอันๆ
- **`POST` /api/seals/assign-by-techcode** - การเชื่อมโยงซีลไปที่รหัสพนักงานช่าง
- **`PUT` /api/seals/:seal_number/cancel** - ระงับการใช้งานหรือยกเลิกซีล (คืนกลับเข้าสู่สถานะ `พร้อมใช้งาน`)
- **`PUT` /api/seals/:seal_number/accept-return** - [Admin] กดยืนยันรับการคืนซีลเข้าสต็อกตรวจสอบ
- **`PUT` /api/seals/:seal_number/status** - คอยบังคับเปลี่ยนสถานะของซีลนั้นๆ
- **`POST` /api/seals/bulk-update-status** - เปลี่ยนสถานะซีลครั้งละหลายๆ รายการพร้อมกัน
- **`POST` /api/seals/bulk-transfer** - จ่าย/โอนโควตาซีลไปยังรหัสการไฟฟ้าส่วนภูมิภาคอื่นๆ ทีละหลายๆ อัน

---

## 4. ระบบช่างเทคนิค (Technician)
การทำงานของ Technician บน Mobile App และที่เกี่ยวข้อง

**Public Routes (เข้าผ่านแอพช่าง ไม่ต้องใช้ JWT):**
- **`POST` /api/technician/register** - สมัครสมาชิก/ลงทะเบียนช่างใหม่
- **`POST` /api/technician/login** - เข้าสู่ระบบของช่าง
- **`POST` /api/technician/import** - นำเข้ารายชื่อช่างเทคนิคครั้งละมากๆ (Excel/JSON)
- **`POST` /api/technician/reset-passwords** - Reset รหัสผ่านช่างทั้งหมดในระบบ
- **`POST` /api/technician/set-password** - บังคับตั้งค่ารหัสผ่านใหม่สำหรับพนักงานเจาะจง
- **`GET` /api/technician/list** - แสดงรายการรายชื่อช่างทั้งหมด
- **`PUT` /api/technician/update/:id** - อัปเดตข้อมูลรายละเอียดช่างเทคนิค
- **`DELETE` /api/technician/delete/:id** - การลบไอดีช่างเทคนิค

**Protected Routes (User Protected - ตรวจสอบ JWT ฝั่ง Web App ปกติ):**
- **`GET` /api/technician/seals** - แสดงซีลทั้งหมดที่ถูกจ่ายออกไปให้ช่าง

**Protected Routes (สำหรับช่าง - ใช้ Token จากช่างเท่านั้น):**
- **`GET` /api/technician/my-seals** - แสดงซีลทั้งหมดที่ในมือช่าง (Assigned)
- **`PUT` /api/technician/seals/install** - การบันทึกติดซีลใหม่กับเครื่องวัดโดยช่าง
- **`POST` /api/technician/seals/return** - ทำเรื่องขอคืนซีลเข้าคลังส่วนกลาง
- **`GET` /api/technician/seals/check-return/:seal_number** - ตรวจสอบสถานะการอนุมัติการคืนซีล
- **`POST` /api/technician/seals/upload-images** - ส่งอัปโหลดรูปภาพหลักฐานอ้างอิงการติดตั้ง
- **`POST` /api/technician/seals/transfer** - จัดโอนส่งมอบเลขซีลระหว่างช่างกันเอง
- **`GET` /api/technician/seals/center-list** - รายชื่อชุดบัญชีซีลโดยรวมของศูนย์
- **`POST` /api/technician/device-token** - อัปเดตหมายเลข Token มือถือสำหรับ Push Notification
- **`GET` /api/technician/me** - ดึงรายละเอียด Profile ตัวฉัน
- **`GET` /api/technician/notifications** - ดึงรายการแจ้งเตือน Push Notification
- **`DELETE` /api/technician/notifications** - ล้างการแจ้งเตือนของตัวเอง

---

## 5. บันทึกการใช้งานระบบ (Logs)
ส่วนแสดงประวัติเหตุการณ์ต่างๆ สำหรับ Auditing

- **`GET` /api/logs/created** - ตรวจสอบ Log เหตุการณ์ซีลถูกสร้าง
- **`GET` /api/logs/issued** - ตรวจสอบ Log เหตุการณ์ซีลถูกจ่ายไปยังพนักงาน/ช่าง
- **`GET` /api/logs/used** - ตรวจสอบ Log เหตุการณ์ซีลถูกติดตั้ง / ใช้งานจริง
- **`GET` /api/logs/returned** - ตรวจสอบ Log เหตุการณ์ซีลถูกคืนระบบ
- **`POST` /api/logs/** - กดบันทึก Log ภายในระบบใหม่
- **`GET` /api/logs/** - ตรวจสอบ Log ทุกรายการทั้งหมดรวมกัน
- **`GET` /api/logs/type/:log_type** - กรอง Log แยกตามประเภทของ Type นั้นๆ ตัวอย่างเช่น `"จ่ายซิล"`
- **`GET` /api/logs/user/:user_id** - ตรวจสอบประวัติพฤติกรรมการใช้งานผ่านรหัสพนักงาน
- **`GET` /api/logs/range** - ค้นหา Log พร้อมกับวันที่ตั้งแต่เริ่ม - วันที่สิ้นสุด (`?start=YYYY-MM-DD&end=YYYY-MM-DD`)
- **`GET` /api/logs/:log_id** - ดูรายละเอียด Log นั้นๆ เจาะจงเดียว
- **`DELETE` /api/logs/:log_id** - เคลียร์หรือลบ Log เก่าออกจำเพาะ (Admin เท่านั้น)

---

## 6. รายงาน (Reports)
สร้างรายงานส่งออกหรือดึงดูภาพรวมขององค์กร

- **`GET` /api/report/seals** - สร้างรายงานภาพรวมการใช้ซีลผ่าน parameter Query (`?pea_code=&status=&start_date=&end_date=`)

---

## 7. ข้อมูลพื้นฐานองค์กร (MasCom)
การตั้งค่าจัดการศูนย์และต้นสังกัดรหัสบริษัทหรือการติดตั้งใน PEA

- **`POST` /api/mascom/** - สร้างเขตบริษัทหรือต้นสังกัดใหม่
- **`GET` /api/mascom/** - ดึงรายชื่อต้นสังกัดทั้งหมด
- **`GET` /api/mascom/pea/:peaCode** - ค้นหาบริษัทตามรหัสสาขา PEA ของสังกัด
- **`GET` /api/mascom/:code** - ดึงข้อมูลบริษัทเจาะจงด้วยระบบรหัสสังกัดที่สร้าง
- **`PUT` /api/mascom/:id** - แก้ไขรายละเอียดบริษัท
- **`DELETE` /api/mascom/:id** - ลบบริษัท

---

## 8. ข้อมูลการไฟฟ้า (MasPea)
อ้างอิงตั้งค่าพื้นฐานสำหรับภูมิภาค รหัสภาค/การไฟฟ้า PEA

- **`POST` /api/maspea/** - เพิ่มข้อมูลรหัสสถานที่การไฟฟ้าลงฐานข้อมูล
- **`GET` /api/maspea/** - แสดงรหัสสถานที่ PEA ทั้งหมด
- **`GET` /api/maspea/:code** - อ้างอิงตรวจสอบรหัสการไฟฟ้าที่เจาะจงตามโค้ด PEA

---

## 9. สแกนซีลสาธารณะ (Public Seal Scan)
ระบบสแกนสำหรับการทำงานกับ Application ของช่าง 

- **`POST` /api/scan-seal** - ยิงบาร์โค้ดแล้วประมวลผลการทำงานอัตโนมัติ 
- **`GET` /api/scan-seal/check/:seal_number** - ช่วยตรวจสอบข้อมูลซีลเบื้องต้นก่อนทำงานกับ API แสกน
- **`GET` /api/check-seal/:seal_number** - เช็คข้อมูลความเป็นเจ้าของ (Ownership) ว่าช่างคนนี้ดูแลตรงกับซีลตัวนี้หรือไม่

---
> *เอกสารอ้างอิงอัตโนมัติจากโครงสร้าง Source Code ปัจจุบันของโปรเจค PEAsecSeal*
