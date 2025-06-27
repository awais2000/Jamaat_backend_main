import { Request, Response } from "express";
import pool from "../config/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";


interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log("Login Attempt - Email:", email, "Password:", password);

    const [users]: any = await pool.query(
      "SELECT * FROM tbl_user WHERE email = ?",
      [email]
    );

    if (!users || users.length === 0) {
      console.log(" User not found");
      res
        .status(400)
        .json({ status: 400, message: "Invalid Username or Password" });
      return;
    }

    const user = users[0];
    let storedPassword = user.password;

    if (!storedPassword) {
      console.error("Database Error: Password field is missing");
      res.status(500).json({ status: 500, message: "Internal Server Error" });
      return;
    }

    const isHashed = storedPassword.startsWith("$2b$");

    if (!isHashed) {
      console.log("Hashing plain text password...");
      const hashedPassword = await bcrypt.hash(storedPassword, 10);

      await pool.query("UPDATE tbl_user SET password = ? WHERE email = ?", [
        hashedPassword,
        email,
      ]);
      console.log("Password successfully hashed and updated.");

      storedPassword = hashedPassword;
    }

    const isMatch = await bcrypt.compare(password, storedPassword);
    if (!isMatch) {
      console.log(" Password does not match");
      res
        .status(400)
        .json({ status: 400, message: "Invalid Username or Password" });
      return;
    }

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1h" }
    );

    console.log("Login Successful - User:", user.email);
    res.status(200).send({
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      mobileNumber: user.mobileNumber,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

/*register member*/

export const registerMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      zone,
      profession,
      mobileNumber,
      fullName,
      fatherName,
      email,
      education,
      dob,
      district,
      cnic,
      age,
      address,
      memberType,
    } = req.body;
    //  Check for missing fields
    if (!mobileNumber || !fullName || !memberType) {
      res.status(400).json({ message: "Plesae fill mendatory fields." });
      return;
    }
 
    // ✅ Now get the uploaded image path
    const imagePath = req.file?.path; // from multer
 
    // if (!imagePath) {
    //   res.status(400).json({ message: "Image upload failed or missing." });
    //   return;
    // }
 
    const query = `
      INSERT INTO tbl_members (
        fullName, fatherName, zone, mobileNumber,
        address, education, email, cnic, dob,
        district, age, profession, image, memberType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
 
    const values = [
      fullName,
      fatherName,
      zone,
      mobileNumber,
      address,
      education,
      email,
      cnic,
      dob,
      district,
      age,
      profession,
      imagePath,
      memberType,
    ];
 
    const [result]: any = await pool.query(query, values);
 
    console.log(" Member added:", fullName, " image saved at:", imagePath);
 
    res.status(201).json({
      message: "Member registered successfully",
      member: {
        fullName,
        email,
        image: imagePath,
      },
    });
  } catch (error) {
    console.error(" Error in registerMember:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// export const registerMember = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const {
//       zone,
//       profession,
//       mobileNumber,
//       fullName,
//       fatherName,
//       email,
//       education,
//       dob,
//       district,
//       cnic,
//       age,
//       address,
//     } = req.body;

//     //  Check for missing fields
//     if (
//       !zone || !profession || !mobileNumber || !fullName ||
//       !fatherName || !email || !education || !dob || !district ||
//       !cnic || !age || !address
//     ) {
//        res.status(400).json({ message: "All fields are required." });
//     }

//     //  Now get the uploaded image path
//     const imagePath = req.file?.path; // from multer

//     if (!imagePath) {
//        res.status(400).json({ message: "Image upload failed or missing." });
//     }

//     const query = `
//       INSERT INTO tbl_members (
//         fullName, fatherName, zone, mobileNumber,
//         address, education, email, cnic, dob,
//         district, age, profession, image
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     const values = [
//       fullName,
//       fatherName,
//       zone,
//       mobileNumber,
//       address,
//       education,
//       email,
//       cnic,
//       dob,
//       district,
//       age,
//       profession,
//       imagePath,
//     ];

//     const [result]: any = await pool.query(query, values);

//     console.log(" Member added:", fullName, " image saved at:", imagePath);

//     res.status(201).json({
//       message: "Member registered successfully",
//       member: {
//         fullName,
//         email,
//         image: imagePath,
//       },
//     });
//   } catch (error) {
//     console.error(" Error in registerMember:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

export const uploadImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const uploadedImage = (req as MulterRequest).file;

    if (!uploadedImage) {
      res.status(400).json({ message: "No image file uploaded" });
      return;
    }

    const imagePath = path.join("uploads/images/", uploadedImage.filename);

    res.status(200).json({
      message: "Image uploaded successfully",
      imagePath,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/*get members*/

 
export const getMembers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
 
    const [rows]: any = await pool.query(
      `SELECT
    m.id,
    m.fullName,
    m.fatherName,
    z.zone,
    m.mobileNumber,
    m.address,
    m.education,
    m.email,
    m.cnic,
    d.district as districtName,
    m.age,
    m.profession,
    m.image,
    DATE_FORMAT(CONVERT_TZ(m.dob, '+00:00', @@session.time_zone), '%Y-%m-%d') AS dob,
    m.memberType
FROM tbl_members m
JOIN tbl_district d ON d.id = m.district
JOIN tbl_zone z ON z.id = m.zone
WHERE m.status = 'Y'
LIMIT ? OFFSET ?

    `,
      [limit, offset]
    );
 
    const [countResult]: any = await pool.query(`
      SELECT COUNT(*) AS total FROM tbl_members WHERE status = 'Y'
    `);
 
    const totalEntries = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalEntries / limit);
 
    if (!rows || rows.length === 0) {
      res.status(404).json({ message: "No users found!" });
      return;
    }
 
    const members = await Promise.all(
      rows.map(async (member: any) => {
        let image: string | null = null;
 
        if (member.image && fs.existsSync(member.image)) {
          try {
            const imageBuffer = fs.readFileSync(path.resolve(member.image));
            const mimeType =
              path.extname(member.image).toLowerCase() === ".png"
                ? "image/png"
                : "image/jpeg";
            image = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
          } catch (error) {
            console.error(
              ` Error reading image for member ${member.id}:`,
              error
            );
          }
        }
 
        return {
          id: member.id,
          fullName: member.fullName,
          fatherName: member.fatherName,
          zone: member.zone,
          mobileNumber: member.mobileNumber,
          address: member.address,
          education: member.education,
          email: member.email,
          cnic: member.cnic,
          districtName: member.districtName,
          age: member.age,
          profession: member.profession,
          dob: member.dob,
          image,
          memberType: member.memberType
        };
      })
    );
 
    res.status(200).json(members);
  } catch (error) {
    console.error(" Error fetching members:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
 

/*Delete member */

export const deleteMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const [member]: any = await pool.query(
      `SELECT * FROM tbl_members WHERE id = ?`,
      [id]
    );
    if (!member.length) {
      res.status(404).json({ message: "Member not found!" });
    }

    await pool.query(`UPDATE tbl_members SET status = 'N' WHERE id = ?`, [id]);

    const [updatedMember]: any = await pool.query(
      `SELECT * FROM tbl_members WHERE id = ?`,
      [id]
    );

    res.status(200).json(updatedMember[0]);
  } catch (error) {
    console.error(" Error deleting member:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

/* update member */
export const updateMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
 
    const {
      zone,
      profession,
      mobileNumber,
      fullName,
      fatherName,
      email,
      education,
      dob,
      district,
      cnic,
      age,
      address,
      image: imageFromBody, // in case provided manually (e.g. Postman)
      memberType
    } = req.body;
 
    console.log(memberType)
 
    const newImagePath = req.file?.path; // multer-uploaded image
 
    if (!zone || !mobileNumber || !fullName || !district || !memberType) {
      res.status(400).json({ message: "All required fields must be filled!" });
      return;
    }
 
    const [existingMember]: any = await pool.query(
      `SELECT * FROM tbl_members WHERE id = ?`,
      [id]
    );
 
    if (existingMember.length === 0) {
      res.status(404).json({ message: "Member not found!" });
      return;
    }
 
    const oldImagePath = existingMember[0].image;
 
    // Determine final image path
    const finalImagePath = newImagePath || imageFromBody || oldImagePath;
 
    // Optional: delete old image if new one is uploaded
    if (newImagePath && oldImagePath && fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
 
    const query = `
      UPDATE tbl_members SET
        fullName = ?,
        fatherName = ?,
        zone = ?,
        mobileNumber = ?,
        address = ?,
        education = ?,
        email = ?,
        cnic = ?,
        dob = ?,
        district = ?,
        age = ?,
        profession = ?,
        image = ?,
        memberType = ?
      WHERE id = ?
    `;
 
    const values = [
      fullName,
      fatherName,
      zone,
      mobileNumber,
      address,
      education,
      email,
      cnic,
      dob.split("T")[0],
      district,
      age,
      profession,
      finalImagePath,
      memberType,
      id,
    ];
 
    const [result]: any = await pool.query(query, values);
 
    if (result.affectedRows === 0) {
      res.status(500).json({ message: "Failed to update member." });
      return;
    }
 
    const [updatedMember]: any = await pool.query(
      `select d.district as districtName, z.*, m.*
      from tbl_members m join
      tbl_district d on
      d.id = m.district
      join tbl_zone z  on z.id = m.zone WHERE m.id = ?`,
      [id]
    );

    res.status(200).json({...updatedMember[0]});
  } catch (error) {
    console.error(" Error updating member:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};



export const editMember = async (
  req: Request,
  res: Response
): Promise<void> => {
    try {
      const id =req.params.id;
      const [query]: any = await pool.query(`select m.*, d.id, d.district as districtName, z.*
      from tbl_members m join
      tbl_district d on 
      m.district = d.id
      join tbl_zone z on
      z.id = m.zone
      where m.status
      and m.id = ?`,
      [id]
    );

    res.status(200).send(query);
    } catch (error) {
        console.error("Error Getting member:", error);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
      
    }
}
 

/* add district */
/* add district */
export const addDistrict = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { district } = req.body;
    if (!district) {
      res.send({ message: "add District!" });
      return;
    }
 
    const [query]: any = await pool.query(
      `insert into tbl_district (district) values (?)`,
      [district]
    );
    const [getUpdated]: any = await pool.query(
      `select * from tbl_district where district = ?`,
      [district]
    );
 
    res.status(200).send({ ...getUpdated[0] });
  } catch (error) {
    console.error(" Error adding district!:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
/* get district */
 
export const getDistrict = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
 
    // Get paginated districts
    const [rows]: any = await pool.query(
      `SELECT *
       FROM tbl_district
       WHERE status = 'Y'
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
 
    // Get total count
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM tbl_district
       WHERE status = 'Y'
         AND district IS NOT NULL`
    );
 
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
 
    if (!rows || rows.length === 0) {
      res.status(404).json({ message: "No districts found!" });
      return;
    }
 
    res.status(200).json(rows);
  } catch (error) {
    console.error(" Error getting district:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
/* update district */
 
export const updateDistrict = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    const { district } = req.body;
 
    if (!id || !district) {
      res.send({ message: "Please Provide district information!" });
      return;
    }
 
    const [update]: any = await pool.query(
      `update tbl_district set district = ? where id  = ?`,
      [district, id]
    );
    const [getUpdated]: any = await pool.query(
      `select * from tbl_district where id = ?`,
      [id]
    );
 
    res.status(200).send({ ...getUpdated[0] });
  } catch (error) {
    console.error(" Error getting district!:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
/* delete district */
 
export const deleteDistrict = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.send({ message: "Please provide an ID!" });
      return;
    }
 
    const [deleteQuery]: any = await pool.query(
      `update tbl_district set status = 'N' where id = ?`,
      [id]
    );
    const [getUpdated]: any = await pool.query(
      `select * from tbl_district where id = ?`,
      [id]
    );
 
    res.status(200).send(getUpdated);
  } catch (error) {
    console.error(" Error deleting district!:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 




export const addZones = async (req: Request, res: Response): Promise<void> => {
  try {
    const { district, zone } = req.body;
    console.log("Request body:", req.body);
 
    if (!zone || !district) {
      res.status(400).send({ message: "Every field is required!" });
      return;
    }
 
    // Insert new zone
    await pool.query(`INSERT INTO tbl_zone (district, zone) VALUES (?, ?)`, [
      district,
      zone,
    ]);
 
    // Get the full joined zone info
    const [rows]: any = await pool.query(
      `select d.* , z.* from tbl_district d
       join tbl_zone z on d.id = z.district
 
       WHERE z.zone = ?
 
       ORDER BY z.id DESC
 
       LIMIT 1`, // ensure you get the latest if same name exists
      [zone]
    );
 
    if (rows.length === 0) {
      res.status(404).json({ message: "Zone not found after insert" });
      return;
    }
 
    console.log("Joined zone result:", rows[0]);
    res.status(200).send(rows[0]);
  } catch (error) {
    console.error(" Error adding Zone:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
/* Get zone */
 
export const getZoneById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
 
    // Get paginated records
    const [rows]: any = await pool.query(
      `select * from tbl_zone
       WHERE status = 'Y'
         AND zone IS NOT NULL  AND district = ?
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );
 
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*)
       AS total
       FROM tbl_zone
       WHERE status = 'Y'
         AND zone IS NOT NULL`
    );
 
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
 
    if (!rows || rows.length === 0) {
      res.status(404).json({ message: "No zones found!" });
      return;
    }
 
    res.status(200).json(rows);
  } catch (error) {
    console.error(" Error getting Zone:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
export const getZonessss = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
 
    // Get paginated records
    const [rows]: any = await pool.query(
      `select d.district as districtName , z.* from tbl_district d
       join tbl_zone z on d.id = z.district
       WHERE z.status = 'Y'
         AND z.zone IS NOT NULL  
         LIMIT ? OFFSET ?`,
      [limit, offset]
    );
 
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*)
       AS total
       FROM tbl_zone
       WHERE status = 'Y'
         AND zone IS NOT NULL`
    );
 
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
 
    if (!rows || rows.length === 0) {
      res.status(404).json({ message: "No zones found!" });
      return;
    }
 
    res.status(200).json(rows);
  } catch (error) {
    console.error(" Error getting Zone:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
/* update zone */
 
export const updateZone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    const { district, zone } = req.body;
 
    console.log("Update Zone Request:", { id, district, zone });
    if (!id || !zone || !district) {
      res.send({ message: "Please Provide Zone information!" });
      return;
    }
 
    const [update]: any = await pool.query(
      `update tbl_zone set district = ?, zone = ? where id  = ?`,
      [district, zone, id]
    );
 
    const [getUpdated]: any = await pool.query(
      `select * from tbl_zone where id = ?`,
      [id]
    );
 
    res.status(200).send({ ...getUpdated[0] });
  } catch (error) {
    console.error(" Error Updating Zone!:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
/* delete zone */
 
export const deleteZone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.send({ message: "Please provide an ID!" });
      return;
    }
 
    const [deleteQuery]: any = await pool.query(
      `update tbl_zone set status = 'N' where id = ?`,
      [id]
    );
    const [getUpdated]: any = await pool.query(
      `select * from tbl_zone where id = ?`,
      [id]
    );
 
    res.status(200).send(getUpdated);
  } catch (error) {
    console.error(" Error deleting Zone!:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 

/*add event */

// export const addEvent = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const {
//       eventName,
//       date,
//       location,
//       description,
//       image,
//       focalPersonName,
//       focalPersonNumber,
//       focalPersonEmail,
//       infoPersonName,
//       infoPersonNumber,
//       infoPersonEmail,
//       eventType,
//     } = req.body;

//     const [existingEvent]: any = await pool.query(
//       `select * from tbl_event where eventName= ?`,
//       [eventName]
//     );

//     if (existingEvent.lenght > 0) {
//       res.send({ message: "Event already Exist!" });
//       return;
//     }
//     if (
//       !eventName ||
//       !date ||
//       !location ||
//       !focalPersonName ||
//       !focalPersonNumber ||
//       !focalPersonEmail
//     ) {
//       res.status(400).send({ message: "Provide all required fields!" });
//       return;
//     }

//     const query = `insert into tbl_event (
//           eventName,
//           date,
//           location,
//           description,
//           image,
//           focalPersonName,
//           focalPersonNumber,
//           focalPersonEmail,
//           infoPersonName,
//           infoPersonNumber,
//           infoPersonEmail,
//           eventType
//           ) values (?,?,?,?,?,?,?,?,?,?,?,?)`;

//     const values = [
//       eventName,
//       date,
//       location,
//       description,
//       image,
//       focalPersonName,
//       focalPersonNumber,
//       focalPersonEmail,
//       infoPersonName,
//       infoPersonNumber,
//       infoPersonEmail,
//       eventType,
//     ];

//     const [result]: any = await pool.query(query, values);
//     const [getEvents]: any = await pool.query(
//       `select *,
//                   DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS currentDate
//                   from tbl_event where eventName = ? `,
//       [eventName]
//     );
//     res.status(200).send({ ...getEvents[0] });
//   } catch (error) {
//     console.error(" Error adding event!:", error);
//     res.status(500).json({ status: 500, message: "Internal Server Error" });
//   }
// };

export const addEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      eventName,
      date,
      location,
      description,
      focalPersonName,
      focalPersonNumber,
      focalPersonEmail,
      infoPersonName,
      infoPersonNumber,
      infoPersonEmail,
      eventType,
    } = req.body;
 
    console.log({ a: req.file, b: req.files });
 
    // ✅ Use uploaded image from multer
    const imagePath = req.file?.path;
 
    console.log({ imagePath });
 
    // 🔍 Check if event already exists
    const [existingEvent]: any = await pool.query(
      `SELECT * FROM tbl_event WHERE eventName = ?`,
      [eventName]
    );
 
    if (existingEvent.length > 0) {
      res.send({ message: "Event already exists!" });
      return;
    }
 
    console.log({
      eventName,
      date,
      location,
      focalPersonName,
      focalPersonNumber,
      focalPersonEmail,
      imagePath,
    });
 
    //  Validate required fields
    if (
      !eventName ||
      !date ||
      !focalPersonName
    ) {
      res
        .status(400)
        .send({ message: "Provide all required fields including image!" });
      return;
    }
 
    // ✅ Insert new event
    const query = `
      INSERT INTO tbl_event (
        eventName, date, location, description, image,
        focalPersonName, focalPersonNumber, focalPersonEmail,
        infoPersonName, infoPersonNumber, infoPersonEmail, eventType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
 
    const values = [
      eventName,
      date,
      location,
      description,
      imagePath,
      focalPersonName,
      focalPersonNumber,
      focalPersonEmail,
      infoPersonName,
      infoPersonNumber,
      infoPersonEmail,
      eventType,
    ];
 
    const [result]: any = await pool.query(query, values);
 
    const [getEvents]: any = await pool.query(
      `SELECT *, DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS currentDate
       FROM tbl_event WHERE eventName = ?`,
      [eventName]
    );
 
    res.status(200).send({ ...getEvents[0] });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 

/*get event */

export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rows]: any = await pool.query(
      `SELECT 
        *,
        DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS eventDate
      FROM tbl_event 
      WHERE eventStatus = 'Y' 
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM tbl_event WHERE eventStatus = 'Y'`
    );
    const totalEntries = countResult[0].total;
    const totalPages = Math.ceil(totalEntries / limit);

    if (!rows || rows.length === 0) {
      res.status(404).json({ message: "No events found!" });
      return;
    }

    const events = rows.map((event: any) => {
      let image: string | null = null;

      if (event.image && fs.existsSync(event.image)) {
        const imageBuffer = fs.readFileSync(path.resolve(event.image));
        const mimeType =
          path.extname(event.image).toLowerCase() === ".png"
            ? "image/png"
            : "image/jpeg";
        image = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
      }

      return {
        id: event.id,
        eventName: event.eventName,
        date: event.eventDate,
        location: event.location,
        description: event.description,
        eventType: event.eventType,
        startTime: event.startTime,
        endTime: event.endTime,
        presentTime: event.presentTime,
        eventStatus: event.eventStatus,
        endNote: event.endNote,
        endStatus: event.endStatus,
        focalPersonName: event.focalPersonName,
        focalPersonNumber: event.focalPersonNumber,
        focalPersonEmail: event.focalPersonEmail,
        infoPersonName: event.infoPersonName,
        infoPersonNumber: event.infoPersonNumber,
        infoPersonEmail: event.infoPersonEmail,
        image,
      };
    });

    res.status(200).json(events);
  } catch (error) {
    console.error(" Error fetching events:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    const {
      eventName,
      date,
      location,
      description,
      focalPersonName,
      focalPersonNumber,
      focalPersonEmail,
      infoPersonName,
      infoPersonNumber,
      infoPersonEmail,
      eventType,
    } = req.body;
 
    const newImagePath = req.file?.path; // ✅ Get uploaded image path
 
    if (
      !eventName ||
      !date ||
      !focalPersonName
    ) {
      res.status(400).send({ message: "Provide all required fields!" });
      return;
    }
 
    const [existingEvent]: any = await pool.query(
      `
      SELECT *,
      DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS currentDate
      FROM tbl_event WHERE id = ?`,
      [id]
    );
 
    if (existingEvent.length === 0) {
      res.status(404).send({ message: "No Event Found to be updated!" });
      return;
    }
 
    const oldImagePath = existingEvent[0].image;
 
    // Decide image path: new uploaded one or retain the old
    const finalImagePath = newImagePath || oldImagePath;
 
    // Optional: Delete old image if new one is uploaded
    if (newImagePath && oldImagePath && fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath); // 🧹 Clean up old file
    }
 
    const query = `
      UPDATE tbl_event SET
        eventName = ?,
        date = ?,
        location = ?,
        description = ?,
        image = ?,
        focalPersonName = ?,
        focalPersonNumber = ?,
        focalPersonEmail = ?,
        infoPersonName = ?,
        infoPersonNumber = ?,
        infoPersonEmail = ?,
        eventType = ?
      WHERE id = ?
    `;
 
    const values = [
      eventName,
      date,
      location,
      description,
      finalImagePath,
      focalPersonName,
      focalPersonNumber,
      focalPersonEmail,
      infoPersonName,
      infoPersonNumber,
      infoPersonEmail,
      eventType,
      id,
    ];
 
    await pool.query(query, values);
 
    const [updatedEvent]: any = await pool.query(
      `SELECT *, DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS currentDate
       FROM tbl_event WHERE id = ?`,
      [id]
    );
 
    res.status(200).send({ ...updatedEvent[0] });
  } catch (error) {
    console.error(" Error updating event:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
 
export const deleteEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;

    const [event]: any = await pool.query(
      `SELECT *,
          DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS currentDate
          FROM tbl_event WHERE id = ?`,
      [id]
    );

    if (event.length === 0) {
      res.status(404).json({ message: "No Event Found to delete!" });
      return;
    }

    await pool.query(`UPDATE tbl_event SET eventStatus = 'N' WHERE id = ?`, [
      id,
    ]);

    res.status(200).send({ ...event[0] });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

/*Search event */

// export const searchEvent = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const searchQuery = req.query.q as string;

//     if (!searchQuery) {
//       res.status(400).json({ message: "Search query is required!" });
//       return;
//     }

//     const sql = `
//           SELECT 
//               id,
//               eventName, 
//               location, 
//               description, 
//               image, 
//               focalPersonName, 
//               focalPersonNumber, 
//               focalPersonEmail, 
//               infoPersonName, 
//               infoPersonNumber, 
//               infoPersonEmail, 
//               eventType, 
//               startTime, 
//               endTime, 
//               presentTime, 
//               eventStatus, 
//               DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS currentDate
//           FROM tbl_event 
//           WHERE 
//               (eventName LIKE ? OR 
//               location LIKE ? OR 
//               description LIKE ? OR 
//               focalPersonName LIKE ? OR 
//               focalPersonEmail LIKE ? OR 
//               infoPersonName LIKE ? OR 
//               infoPersonEmail LIKE ?) 
//           AND eventStatus = 'Y' 
//       `;

//     const values = Array(7).fill(`%${searchQuery}%`); // Wildcard search for multiple fields
//     const [results]: any = await pool.query(sql, values);

//     res.json(results);
//   } catch (error) {
//     console.error("Error searching events:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };
export const searchEvent = async (

  req: Request,

  res: Response

): Promise<void> => {

  try {

    const searchQuery = req.query.q as string;
 
    if (!searchQuery) {

      res.status(400).json({ message: "Search query is required!" });

      return;

    }
 
    const sql = `

      SELECT 

        id,

        eventName, 

        location, 

        description, 

        image, 

        focalPersonName, 

        focalPersonNumber, 

        focalPersonEmail, 

        infoPersonName, 

        infoPersonNumber, 

        infoPersonEmail, 

        eventType, 

        startTime, 

        endTime, 

        presentTime, 

        eventStatus, 

        DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS currentDate

      FROM tbl_event 

      WHERE 

        (eventName LIKE ? OR 

        location LIKE ? OR 

        description LIKE ? OR 

        focalPersonName LIKE ? OR 

        focalPersonEmail LIKE ? OR 

        infoPersonName LIKE ? OR 

        infoPersonEmail LIKE ?) 

        AND eventStatus = 'Y'

    `;
 
    const values = Array(7).fill(`%${searchQuery}%`);

    const [results]: any = await pool.query(sql, values);
 
    if (!results || results.length === 0) {

      res.status(404).json({ message: "No events found!" });

      return;

    }
 
    // Convert image paths to base64

    const events = results.map((event: any) => {

      let base64Image: string | null = null;
 
      if (event.image && fs.existsSync(event.image)) {

        const imageBuffer = fs.readFileSync(path.resolve(event.image));

        const ext = path.extname(event.image).toLowerCase();

        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

        base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

      }
 
      return {

        id: event.id,

        eventName: event.eventName,

        currentDate: event.currentDate,

        location: event.location,

        description: event.description,

        focalPersonName: event.focalPersonName,

        focalPersonNumber: event.focalPersonNumber,

        focalPersonEmail: event.focalPersonEmail,

        infoPersonName: event.infoPersonName,

        infoPersonNumber: event.infoPersonNumber,

        infoPersonEmail: event.infoPersonEmail,

        eventType: event.eventType,

        startTime: event.startTime,

        endTime: event.endTime,

        presentTime: event.presentTime,

        eventStatus: event.eventStatus,

        image: base64Image,

      };

    });
 
    res.status(200).json(events);

  } catch (error) {

    console.error("Error searching events:", error);

    res.status(500).json({ message: "Internal Server Error" });

  }

};
 
/*get event */

export const getEventById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;

    const [query]: any = await pool.query(
      `SELECT *, DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS eventDate FROM tbl_event WHERE id = ?`,
      [id]
    );

    if (!query || query.length === 0) {
      res.status(404).json({ message: "Event not found!" });
      return;
    }

    const event = query[0];

    // Read image and convert to base64
    let image: string | null = null;

    try {
      if (event.image && fs.existsSync(event.image)) {
        const imageBuffer = fs.readFileSync(path.resolve(event.image));
        const mimeType =
          path.extname(event.image).toLowerCase() === ".png"
            ? "image/png"
            : "image/jpeg";
        image = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.warn(` Could not read image for event ID ${id}:`, err);
    }

    res.status(200).send({
      ...event,
      image,
    });
  } catch (error) {
    console.error(" Error fetching event detail:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

/*start event */
export const startEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    console.log("📥 Event ID Received:", eventId);

    // Check if already started
    const [checkEvent]: any = await pool.query(
      `SELECT * FROM tbl_events_detail WHERE eventId = ?`,
      [eventId]
    );

    const [checkEndTime]: any = await pool.query(
      `SELECT startTime, endTime FROM tbl_event WHERE id = ?`,
      [eventId]
    );

    // If event has not started, insert record and set startTime
    if (checkEvent.length === 0 || !checkEndTime[0]?.startTime) {
      await pool.query(`INSERT INTO tbl_events_detail (eventId) VALUES (?)`, [
        eventId,
      ]);
      await pool.query(
        `UPDATE tbl_event SET startTime = CURRENT_TIMESTAMP WHERE id = ?`,
        [eventId]
      );
    }

    // Fetch full event
    const [result]: any = await pool.query(
      `SELECT *, DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS eventDate
       FROM tbl_event WHERE id = ?`,
      [eventId]
    );

    if (!result || result.length === 0) {
      res.status(404).json({ message: "Event not found!" });
      return;
    }

    const event = result[0];
    let image: string | null = null;

    try {
      if (event.image && fs.existsSync(event.image)) {
        const imageBuffer = fs.readFileSync(path.resolve(event.image));
        const mimeType =
          path.extname(event.image).toLowerCase() === ".png"
            ? "image/png"
            : "image/jpeg";
        image = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
      }
    } catch (imgErr) {
      console.warn(` Could not read image for event ID ${eventId}:`, imgErr);
    }

    res.status(200).json({
      ...event,
      image,
    });
  } catch (error) {
    console.error(" Error starting event:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};





/*search event */

export const searchMember = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const searchQuery = req.query.q as string;
    if (!searchQuery) {
      res.status(400).json({ message: "Search query is required!" });
      return;
    }
    const sql = `
    SELECT
 
    m.id,
 
    m.fullName,
 
    m.fatherName,
 
    m.zone,
 
    z.zone,
 
    m.mobileNumber,
 
    m.address,
 
    m.education,
 
    m.email,
 
    m.cnic,
 
    m.district,
 
    d.district as districtName,
 
    m.age,
 
    m.profession,
 
    DATE_FORMAT(NOW(), '%h:%i %p') AS currentTime
 
FROM tbl_members m
 
JOIN tbl_district d ON m.district = d.id
 
JOIN tbl_zone z ON m.zone = z.id
 
WHERE
 
    (
 
        m.fullName LIKE ? OR
 
        m.fatherName LIKE ? OR
 
        z.zone LIKE ? OR
 
        m.mobileNumber LIKE ? OR
 
        m.address LIKE ? OR
 
        m.education LIKE ? OR
 
        m.email LIKE ? OR
 
        m.cnic LIKE ? OR
 
        d.district LIKE ? OR
 
        m.profession LIKE ?
 
    )
 
    AND m.status = 'Y' AND m.joinStatus = 'Y'
    `;
    const values = Array(10).fill(`%${searchQuery}%`);
    const [results]: any = await pool.query(sql, values);

    res.json(results);
  } catch (error) {
    console.error("Error searching members:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};






// export const joinEvent = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { eventId, memberId } = req.params;
//     if (!memberId || !eventId) {
//       res.status(400).json({ message: "Provide Member Info!" });
//       return;
//     }
//     const [checkStart]: any = await pool.query(
//       `SELECT eventId FROM tbl_events_detail where eventId = ?`,
//       [eventId]
//     );
//     if (!checkStart.length || !checkStart[0]?.eventId) {
//       res.send({ message: "Please start an event to continue!" });
//       return;
//     }

//     //  Check if the member exists in tbl_members
//     const [existingMember]: any = await pool.query(
//       "SELECT * FROM tbl_members WHERE id = ?",
//       [memberId]
//     );
//     if (existingMember.length === 0) {
//       res.status(404).json({ message: "Member not found!" });
//       return;
//     }
//     //  Check if the member has already clocked in
//     const [checkClockin]: any = await pool.query(
//       "SELECT memberClockin, memberClockout FROM tbl_events_detail WHERE memberId = ? AND eventId = ?",
//       [memberId, eventId]
//     );
//     console.log("Fetched Attendance:", checkClockin);
//     //  If user has never clocked in, add them and set clock-in time
//     if (!checkClockin[0]) {
//       await pool.query(
//         `INSERT INTO tbl_events_detail (eventId, memberId, memberClockin, eventStatus)
//   VALUES (?, ?, CURRENT_TIMESTAMP(), 'Join')`,
//         [eventId, memberId]
//       );
//       await pool.query(`update tbl_members set joinStatus = 'N' where id = ?`, [
//         memberId,
//       ]);
//       const [clockinData]: any = await pool.query(
//         `select * from tbl_members where id = ?`,
//         [memberId]
//       );
//       const data = clockinData[0];
//       res.status(200).json(data); // Now this will return just the object, not an object inside an object
//       return;
//     }
//     // ---------->
//     //  If user already clocked in but not clocked out, proceed with clock-out
//     if (checkClockin[0].memberClockout === null) {
//       await pool.query(
//         `UPDATE tbl_events_detail
//   SET   eventStatus = 'Leave'
//   WHERE eventId = ? AND memberId = ?`,
//         [eventId, memberId]
//       );
//       //  Re-fetch updated data
//       const [updatedEvent]: any = await pool.query(
//         "SELECT memberClockin, memberClockout FROM tbl_events_detail WHERE memberId = ? AND eventId = ?",
//         [memberId, eventId]
//       );
//       // if (!updatedEvent[0].memberClockout) {
//       //   res.status(400).json({ message: "Clock-out time update failed." });
//       //   return;
//       // }
//       //  Calculate Working Hours
//       const [timeDiffResult]: any = await pool.query(
//         `SELECT
//   LPAD(TIMESTAMPDIFF(HOUR, memberClockin, memberClockout), 2, '0') AS Hours,
//   LPAD(TIMESTAMPDIFF(MINUTE, memberClockin, memberClockout) % 60, 2, '0') AS Minutes
//   FROM tbl_events_detail WHERE memberId = ? AND eventId = ?`,
//         [memberId, eventId]
//       );
//       console.log("Working Hours Calculation:", timeDiffResult);
//       const { Hours, Minutes } = timeDiffResult[0] || {
//         Hours: "0",
//         Minutes: "00",
//       };
//       //  Format Hours & Minutes
//       let formattedWorkingHours = "";
//       if (Hours !== "00" && Hours !== "0") {
//         formattedWorkingHours += `${Hours} Hour${Hours !== "1" ? "s" : ""} `;
//       }
//       if (Minutes !== "00") {
//         formattedWorkingHours += `${Minutes} Minute${
//           Minutes !== "1" ? "s" : ""
//         }`;
//       }
//       if (!formattedWorkingHours) {
//         formattedWorkingHours = "0 Minutes"; // Default if both are 0
//       }
//       console.log(`Final Working Hours: ${formattedWorkingHours}`);
//       //  Update `workingHours` field
//       await pool.query(
//         `UPDATE tbl_events_detail
//   SET presentHours = ?
//   WHERE memberId = ? AND eventId = ?`,
//         [formattedWorkingHours.trim(), memberId, eventId]
//       );

//       const [finalData]: any = await pool.query(
//         "SELECT * FROM tbl_events_detail WHERE memberId = ? AND eventId = ?",
//         [memberId, eventId]
//       );
//       res.status(200).json(finalData);
//       return;
//     }
//     //  If user has already clocked out, prevent re-clock-out
//     res.status(400).json({
//       message: "You have already clocked out!",
//     });
//   } catch (error) {
//     console.error("Error processing attendance:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };



export const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, memberId } = req.params;

    if (!memberId || !eventId) {
      res.status(400).json({ message: "Provide Member Info!" });
      return;
    }

    const [checkStart]: any = await pool.query(
      `SELECT eventId FROM tbl_events_detail WHERE eventId = ?`,
      [eventId]
    );

    if (!checkStart.length || !checkStart[0]?.eventId) {
      res.status(404).json({ message: "Please start an event to continue!" });
      return;
    }

    const [existingMember]: any = await pool.query(
      "SELECT * FROM tbl_members WHERE id = ?",
      [memberId]
    );

    if (existingMember.length === 0) {
      res.status(404).json({ message: "Member not found!" });
      return;
    }

    const [attendance]: any = await pool.query(
      `SELECT memberClockin, memberClockout 
       FROM tbl_events_detail 
       WHERE memberId = ? AND eventId = ?`,
      [memberId, eventId]
    );

    //  First-time clock-in
    if (!attendance[0]) {
      await pool.query(
        `INSERT INTO tbl_events_detail (
          eventId, memberId, memberClockin, eventStatus
        ) VALUES (?, ?, CURRENT_TIMESTAMP(), 'Join')`,
        [eventId, memberId]
      );

      await pool.query(
        `UPDATE tbl_members SET joinStatus = 'N' WHERE id = ?`,
        [memberId]
      );

      const [clockinData]: any = await pool.query(
        `SELECT * FROM tbl_members WHERE id = ?`,
        [memberId]
      );

      res.status(200).json(clockinData[0]);
      return;
    }

    const { memberClockin, memberClockout } = attendance[0];

    //  Clock-out flow (still clocked in)
    if (memberClockout === null && memberClockin !== null) {
      // 1. Set status to leave & nullify clockin
      await pool.query(
        `UPDATE tbl_events_detail
         SET eventStatus = 'Leave',
             memberClockout = CURRENT_TIMESTAMP(),
             memberClockin = NULL
         WHERE memberId = ? AND eventId = ?`,
        [memberId, eventId]
      );

      // 2. Calculate working hours
      const [timeDiffResult]: any = await pool.query(
        `SELECT
          LPAD(TIMESTAMPDIFF(HOUR, memberClockin, memberClockout), 2, '0') AS Hours,
          LPAD(TIMESTAMPDIFF(MINUTE, memberClockin, memberClockout) % 60, 2, '0') AS Minutes
        FROM tbl_events_detail 
        WHERE memberId = ? AND eventId = ?`,
        [memberId, eventId]
      );

      const { Hours, Minutes } = timeDiffResult[0] || {
        Hours: "0",
        Minutes: "00"
      };

      let formattedWorkingHours = "";
      if (Hours !== "00" && Hours !== "0") {
        formattedWorkingHours += `${Hours} Hour${Hours !== "1" ? "s" : ""} `;
      }
      if (Minutes !== "00") {
        formattedWorkingHours += `${Minutes} Minute${Minutes !== "1" ? "s" : ""}`;
      }
      if (!formattedWorkingHours) {
        formattedWorkingHours = "0 Minutes";
      }

      await pool.query(
        `UPDATE tbl_events_detail
         SET presentHours = ?
         WHERE memberId = ? AND eventId = ?`,
        [formattedWorkingHours.trim(), memberId, eventId]
      );

      const [finalData]: any = await pool.query(
        `SELECT * FROM tbl_events_detail WHERE memberId = ? AND eventId = ?`,
        [memberId, eventId]
      );

      res.status(200).json(finalData);
      return;
    }

    //  Re-join flow (if previously left)
    if (memberClockin === null && memberClockout !== null) {
      await pool.query(
        `UPDATE tbl_events_detail
         SET eventStatus = 'Join',
             memberClockin = CURRENT_TIMESTAMP(),
             memberClockout = NULL
         WHERE memberId = ? AND eventId = ?`,
        [memberId, eventId]
      );

      const [updated]: any = await pool.query(
        `SELECT * FROM tbl_events_detail WHERE memberId = ? AND eventId = ?`,
        [memberId, eventId]
      );

      res.status(200).json(updated[0]);
      return;
    }

    //  Already clocked out (fully done)
    res.status(400).json({
      message: "You have already clocked out!"
    });

  } catch (error) {
    console.error("Error processing attendance:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};








export const getJoinMembers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    const page = parseInt(req.query.page as string, 10) || 1; // Default page = 1
    const limit = 10; // Show 10 entries per page
    const offset = (page - 1) * limit; // Calculate offset for pagination
    // Fetch paginated joined members with JOIN
    const [query]: any = await pool.query(
      `SELECT e.*, m.*
  FROM tbl_events_detail e
  JOIN tbl_members m ON e.memberId = m.id
  WHERE e.eventStatus = 'Join' and eventId = ?
  LIMIT ? OFFSET ?`,
      [eventId, limit, offset]
    );
    // Fetch total number of join members for pagination info
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) AS total
  FROM tbl_events_detail
  WHERE eventStatus = 'Join'`
    );
    const totalEntries = countResult[0].total;
    const totalPages = Math.ceil(totalEntries / limit);
    if (query.length === 0) {
      res.status(404).json({ message: "No joined members found!" });
      return;
    }
    res.status(200).json(query);
  } catch (error) {
    console.error(" Error fetching joined members:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

// export const searchEventDetail = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const searchQuery = req.query.q as string;
//     if (!searchQuery) {
//       res.status(400).json({ message: "Search query is required!" });
//       return;
//     }

//     const sql = `
//   SELECT 
//   ed.*, 
//   m.*,
//   e.eventName, 
//   e.date,
//   d.district AS districtName,
//   z.zone 
// FROM tbl_events_detail ed
// JOIN tbl_members m ON m.id = ed.memberId
// JOIN tbl_event e ON ed.eventId = e.id
// JOIN tbl_district d ON d.id = m.district
// JOIN tbl_zone z ON z.id = m.zone
// WHERE
//   (
//     e.eventName LIKE ? OR 
//     m.fullName LIKE ? OR 
//     m.mobileNumber LIKE ? OR 
//     e.date LIKE ? OR
//     d.district LIKE ? OR 
//     z.zone LIKE ?
//   )
//   AND ed.eventStatus IN ('Join', 'leave')
// `;


//     const values = Array(4).fill(`%${searchQuery}%`);
//     const [results]: any = await pool.query(sql, values);

//     res.json(results);
//   } catch (error) {
//     console.error("Error searching event details:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };
export const searchEventDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const searchQuery = req.query.q as string;
    if (!searchQuery) {
      res.status(400).json({ message: "Search query is required!" });
      return;
    }

    const sql = `
      SELECT 
        ed.*, 
        m.*,
        e.eventName, 
        e.date,
        d.district AS districtName,
        z.zone 
      FROM tbl_events_detail ed
      JOIN tbl_members m ON m.id = ed.memberId
      JOIN tbl_event e ON ed.eventId = e.id
      JOIN tbl_district d ON d.id = m.district
      JOIN tbl_zone z ON z.id = m.zone
      WHERE
        (
          e.eventName LIKE ? OR 
          m.fullName LIKE ? OR 
          m.mobileNumber LIKE ? OR 
          e.date LIKE ? OR
          d.district LIKE ? OR 
          z.zone LIKE ?
        )
        AND ed.eventStatus IN ('Join', 'leave')
    `;

    // Create array with 6 elements (one for each ? placeholder)
    const searchPattern = `%${searchQuery}%`;
    const values = [
      searchPattern, // e.eventName
      searchPattern, // m.fullName
      searchPattern, // m.mobileNumber
      searchPattern, // e.date
      searchPattern, // d.district
      searchPattern  // z.zone
    ];

    const [results] = await pool.query(sql, values);

    res.json(results);
  } catch (error) {
    console.error("Error searching event details:", error);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};






export const endEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id;
    const { endNote } = req.body;

    if (!eventId) {
      res.status(400).json({ message: "Please provide the event ID!" });
      return;
    }

    //  Fetch event start and end time
    const [checkEndTime]: any = await pool.query(
      `SELECT startTime, endTime FROM tbl_event WHERE id = ?`,
      [eventId]
    );

    if (!checkEndTime[0]) {
      res.status(404).json({ message: "Event not found!" });
      return;
    }

    //  If endTime is NULL or default, update it
    if (!checkEndTime[0].endTime || checkEndTime[0].endTime === "00:00:00") {
      await pool.query(
        `UPDATE tbl_event SET endTime = CURRENT_TIMESTAMP WHERE id = ?`,
        [eventId]
      );
    }

    //  Calculate event duration
    const [timeDiffResult]: any = await pool.query(
      `SELECT 
          LPAD(TIMESTAMPDIFF(HOUR, startTime, endTime), 2, '0') AS Hours,
          LPAD(TIMESTAMPDIFF(MINUTE, startTime, endTime) % 60, 2, '0') AS Minutes
      FROM tbl_event WHERE id = ?`,
      [eventId]
    );

    const { Hours, Minutes } = timeDiffResult[0] || {
      Hours: "0",
      Minutes: "00",
    };
    let formattedWorkingHours = `${
      Hours !== "00" ? Hours + " Hour" + (Hours !== "1" ? "s " : " ") : ""
    }`;
    formattedWorkingHours += `${
      Minutes !== "00" ? Minutes + " Minute" + (Minutes !== "1" ? "s" : "") : ""
    }`;
    if (!formattedWorkingHours) formattedWorkingHours = "0 Minutes";

    //  Update event present time
    await pool.query(`UPDATE tbl_event SET presentTime = ? WHERE id = ?`, [
      formattedWorkingHours.trim(),
      eventId,
    ]);

    //  Add end note to event
    await pool.query(`UPDATE tbl_event SET endNote = ? WHERE id = ?`, [
      endNote,
      eventId,
    ]);

    //  Fetch all members who haven't clocked out yet
    const [members]: any = await pool.query(
      `SELECT memberId FROM tbl_events_detail WHERE eventId = ? AND memberClockout IS NULL`,
      [eventId]
    );

    //  Loop through each member to clock them out and calculate working hours
    for (const member of members) {
      const memberId = member.memberId;

      await pool.query(
        `UPDATE tbl_events_detail 
         SET memberClockout = CURRENT_TIMESTAMP, eventStatus = 'End'
         WHERE eventId = ? AND memberId = ?`,
        [eventId, memberId]
      );

      //  Calculate individual working hours
      const [timeDiff]: any = await pool.query(
        `SELECT 
            LPAD(TIMESTAMPDIFF(HOUR, memberClockin, memberClockout), 2, '0') AS Hours,
            LPAD(TIMESTAMPDIFF(MINUTE, memberClockin, memberClockout) % 60, 2, '0') AS Minutes
        FROM tbl_events_detail WHERE memberId = ? AND eventId = ?`,
        [memberId, eventId]
      );

      const { Hours: memberHours, Minutes: memberMinutes } = timeDiff[0] || {
        Hours: "0",
        Minutes: "00",
      };

      let memberFormattedHours = `${
        memberHours !== "00"
          ? memberHours + " Hour" + (memberHours !== "1" ? "s " : " ")
          : ""
      }`;
      memberFormattedHours += `${
        memberMinutes !== "00"
          ? memberMinutes + " Minute" + (memberMinutes !== "1" ? "s" : "")
          : ""
      }`;
      if (!memberFormattedHours) memberFormattedHours = "0 Minutes";

      //  Update presentHours for each member
      await pool.query(
        `UPDATE tbl_events_detail 
         SET presentHours = ?
         WHERE memberId = ? AND eventId = ?`,
        [memberFormattedHours.trim(), memberId, eventId]
      );
    }

    await pool.query(
      `update tbl_events_detail set eventStatus = 'End' where eventId = ?`,
      [eventId]
    );
    await pool.query(
      `update tbl_events_detail set eventStatus = 'End' where eventStatus = 'Leave' `
    );

    await pool.query(
      `update tbl_members set joinStatus = 'Y' where joinStatus = 'N'`
    );

    //  Fetch final event details
    const [endedEvent]: any = await pool.query(
      `select m.* , ed.*, e.eventName, e.startTime
      from tbl_members m
      join tbl_events_detail ed on 
      ed.memberId = m.id
      join tbl_event e on 
      e.id = ed.eventId WHERE eventId = ?`,
      [eventId]
    );

    res.status(200).json(endedEvent);
  } catch (error) {
    console.error(" Error processing event end:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getLeaveMembers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    const page = parseInt(req.query.page as string, 10) || 1; // Default page = 1
    const limit = 10; // Show 10 entries per page
    const offset = (page - 1) * limit; // Calculate offset for pagination

    const [query]: any = await pool.query(
      `SELECT e.*, m.*
  FROM tbl_events_detail e
  JOIN tbl_members m ON e.memberId = m.id
  WHERE e.eventStatus = 'Leave' and eventId = ?
  LIMIT ? OFFSET ?`,
      [eventId, limit, offset]
    );

    const [countResult]: any = await pool.query(
      `SELECT COUNT (*) AS total
  FROM tbl_events_detail
  WHERE eventStatus = 'Leave'`
    );
    const totalEntries = countResult[0].total;
    const totalPages = Math.ceil(totalEntries / limit);
    if (query.length === 0) {
      res.status(404).json({ message: "No left members found!" });
      return;
    }

    res.status(200).json(query);
  } catch (error) {
    console.error(" Error fetching left members:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

export const getEndMembers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    const page = parseInt(req.query.page as string, 10) || 1; // Default page = 1
    const limit = 10; // Show 10 entries per page
    const offset = (page - 1) * limit; // Calculate offset for pagination
    // Fetch paginated joined members with JOIN
    const [query]: any = await pool.query(
      `SELECT e.*, m.*
  FROM tbl_events_detail e
  JOIN tbl_members m ON e.memberId = m.id
  WHERE e.eventStatus = 'End' and eventId = ?
  LIMIT ? OFFSET ?`,
      [eventId, limit, offset]
    );
    // Fetch total number of join members for pagination info
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) AS total
  FROM tbl_events_detail
  WHERE eventStatus = 'End'`
    );
    const totalEntries = countResult[0].total;
    const totalPages = Math.ceil(totalEntries / limit);
    if (query.length === 0) {
      res.status(404).json({ message: "No joined members found!" });
      return;
    }
    res.status(200).json(query);
  } catch (error) {
    console.error(" Error fetching joined members:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

export const searchZones = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      res.status(400).json({ message: "Search query (q) is required" });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT DISTINCT zone FROM tbl_configuration 
       WHERE status = 'Y' AND zone IS NOT NULL AND zone LIKE ?`,
      [`%${searchTerm}%`]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Zone Search Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const searchDistricts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      res.status(400).json({ message: "Search query (q) is required" });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT DISTINCT district FROM tbl_configuration 
       WHERE status = 'Y' AND district IS NOT NULL AND district LIKE ?`,
      [`%${searchTerm}%`]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("District Search Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const membersReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    const { district, zone } = req.query;

    let queryStr = `
      SELECT 
  m.id, 
  m.fullName, 
  m.fatherName, 
  m.zone,
  z.zone,
  m.mobileNumber, 
  m.address,
  m.education, 
  m.email, 
  m.cnic, 
  m.district,
  d.district as districtName,
  m.age, 
  m.profession,
  DATE_FORMAT(CONVERT_TZ(m.dob, '+00:00', @@session.time_zone), '%Y-%m-%d') AS dob
FROM tbl_members m
JOIN tbl_district d ON m.district = d.id
JOIN tbl_zone z ON m.zone = z.id
WHERE m.status = 'Y'
LIMIT 10 OFFSET 0;
`;

    let countQueryStr = `SELECT COUNT(*)
 as total FROM tbl_members WHERE status = 'Y'`;

    const queryParams: any[] = [];
    const countParams: any[] = [];

    if (district) {
      queryStr += " AND district = ?";
      countQueryStr += " AND district = ?";
      queryParams.push(district);
      countParams.push(district);
    }

    if (zone) {
      queryStr += " AND zone = ?";
      countQueryStr += " AND zone = ?";
      queryParams.push(zone);
      countParams.push(zone);
    }

    queryStr += " LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    const [rows]: any = await pool.query(queryStr, queryParams);
    const [countResult]: any = await pool.query(countQueryStr, countParams);

    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    if (!rows || rows.length === 0) {
      res.status(404).json({ message: "No User found!" });
      return;
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};




export const EventReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { eventName, from, to, page = "1", limit = "10" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    //  Date format validation (YYYY-MM-DD)
    const isValidDate = (str: string): boolean => {
      return /^\d{4}-\d{2}-\d{2}$/.test(str);
    };

    let queryStr = `
      SELECT 
        id,
        eventName,
        DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%Y-%m-%d') AS eventDate,
        DATE_FORMAT(CONVERT_TZ(date, '+00:00', @@session.time_zone), '%d-%m-%Y') AS eventDateFormatted,
        location,
        description,
        image,
        focalPersonName,
        focalPersonNumber,
        focalPersonEmail,
        infoPersonName,
        infoPersonNumber,
        infoPersonEmail,
        eventType,
        startTime,
        endTime,
        presentTime,
        eventStatus,
        endNote,
        endStatus
      FROM tbl_event 
      WHERE eventStatus = 'Y'
    `;

    const queryParams: any[] = [];

    if (eventName && eventName !== "null") {
      queryStr += " AND id = ?";
      queryParams.push(eventName);
    }

    if (from && isValidDate(from as string)) {
      queryStr += " AND DATE(date) >= ?";
      queryParams.push(from);
    }

    if (to && isValidDate(to as string)) {
      queryStr += " AND DATE(date) <= ?";
      queryParams.push(to);
    }

    queryStr += " ORDER BY date DESC LIMIT ? OFFSET ?";
    queryParams.push(limitNum, offset);

    const [rows]: any = await pool.query(queryStr, queryParams);

    if (!rows || rows.length === 0) {
      res.status(404).json({ message: "No events found" });
      return;
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching event report:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};





export const eventDetailReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { eventName, memberName, from, to, page = "1", limit = "10" } = req.query;
    console.log(eventName)
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;    

    let queryStr = `
      SELECT 
        ed.*, 
        m.fullName, 
        m.mobileNumber, 
        e.eventName, 
        e.id,
        DATE_FORMAT(e.date, '%Y-%m-%d') AS eventDate,
        DATE_FORMAT(e.date, '%Y-%m-%d') AS eventDateFormatted
      FROM tbl_events_detail ed
      JOIN tbl_members m ON m.id = ed.memberId
      JOIN tbl_event e ON ed.eventId = e.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    //  Apply "from" date filter
    if (from) {
      try {
        queryStr += " AND DATE(e.date) >= ?";
        queryParams.push(from);
      } catch {
        res.status(400).json({ message: "Invalid 'from' date format. Use DD-MM-YYYY or YYYY-MM-DD." });
        return;
      }
    }

    //  Apply "to" date filter
    if (to) {
      try {
        queryStr += " AND DATE(e.date) <= ?";
        queryParams.push(to);
      } catch {
        res.status(400).json({ message: "Invalid 'to' date format. Use DD-MM-YYYY or YYYY-MM-DD." });
        return;
      }
    }

    if (eventName) {
      try {
        queryStr += " AND e.id = ?";
        queryParams.push(eventName);
      } catch {
        res.status(400).json({ message: "Invalid 'to' date format. Use DD-MM-YYYY or YYYY-MM-DD." });
        return;
      }
    }

    if (memberName) {
      try {
        queryStr += " AND m.id = ?";
        queryParams.push(memberName);
      } catch {
        res.status(400).json({ message: "Invalid 'to' date format. Use DD-MM-YYYY or YYYY-MM-DD." });
        return;
      }
    }

    //  Add pagination
    queryStr += " ORDER BY e.date DESC LIMIT ? OFFSET ?";
    queryParams.push(limitNum, offset);

    const [results]: any = await pool.query(queryStr, queryParams);

    if (!results || results.length === 0) {
      res.status(404).json({ message: "No event details found!" });
      return;
    }

    res.status(200).json(results);
  } catch (error) {
    console.error(" Error fetching event detail report:", error);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};







export const searchIndividualPresent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const searchQuery = req.query.q as string;
    if (!searchQuery) {
      res.status(400).json({ message: "Search query is required!" });
      return;
    }

    const sql = `
              SELECT
                  ed.*,
                  m.*,
                  e.eventName,
                  e.date
              FROM tbl_events_detail ed
              JOIN tbl_members m ON m.id = ed.memberId
              JOIN tbl_event e ON ed.eventId = e.id
              WHERE
                  (e.eventName LIKE ? OR
                  m.fullName LIKE ? OR
                  m.mobileNumber LIKE ? OR
                  e.date LIKE ?)
          `;

    const values = Array(4).fill(`%${searchQuery}%`);
    const [results]: any = await pool.query(sql, values);

    res.json(results);
  } catch (error) {
    console.error("Error searching event details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const downloadReportPdf = async (req: Request, res: Response) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Members Report</title>
        <style>
          body {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #333;
          }

          header {
            text-align: center;
            border-bottom: 2px solid #ddd;
            margin-bottom: 30px;
          }

          header h1 {
            font-size: 24px;
            color: #2c3e50;
          }

          header p {
            color: #7f8c8d;
            margin-top: 5px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          table th, table td {
            padding: 12px 15px;
            border: 1px solid #ccc;
            text-align: left;
          }

          table thead {
            background-color: #2c3e50;
            color: white;
          }

          table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
          }

          footer {
            position: fixed;
            bottom: 30px;
            width: 100%;
            text-align: center;
            font-size: 12px;
            color: #999;
          }

          .section-title {
            margin-top: 30px;
            font-size: 18px;
            color: #34495e;
          }

          .info-block {
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Members Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </header>

        <div class="info-block">
          <h2 class="section-title">Summary</h2>
          <p>Total Members: 100</p>
          <p>Active Members: 85</p>
          <p>Inactive Members: 15</p>
        </div>

        <h2 class="section-title">Detailed Member List</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Join Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Ali Khan</td>
              <mailto:td>ali@example.com</td>
              <td>Active</td>
              <td>2023-05-10</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Sara Ahmed</td>
              <mailto:td>sara@example.com</td>
              <td>Inactive</td>
              <td>2022-11-19</td>
            </tr>
          </tbody>
        </table>

        <footer>
          &copy; 2025 Your Company Name. All rights reserved.
        </footer>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Load HTML content directly with inline styles
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "3cm",
        bottom: "3cm",
        left: "3cm",
        right: "3cm",
      },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=members_report.pdf",
    });

    fs.writeFileSync("test.pdf", pdfBuffer);

    res.send(pdfBuffer);
  } catch (error) {
    console.error(" Puppeteer PDF error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};
