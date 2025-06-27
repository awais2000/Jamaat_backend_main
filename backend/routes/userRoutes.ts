import express, { Application, Request, Response } from "express";
import { upload } from "../middleware/uploadMiddleware";

import {
  addDistrict,
  addEvent,
  deleteDistrict,
  deleteEvent,
  deleteMember,
  deleteZone,
  endEvent,
  eventDetailReport,
  EventReport,
  getDistrict,
  getEndMembers,
  getEvent,
  getEventById,
  getJoinMembers,
  getLeaveMembers,
  getMembers,
  joinEvent,
  login,
  membersReport,
  registerMember,
  searchDistricts,
  searchEvent,
  searchEventDetail,
  searchIndividualPresent,
  searchMember,
  searchZones,
  startEvent,
  updateDistrict,
  updateEvent,
  updateMember,
  updateZone,
  uploadImage,
  downloadReportPdf,
  getZoneById,
  getZonessss,
  addZones,
  editMember,
} from "../controllers/userController";
import { authenticateToken } from "../middleware/authMiddleware";

export default (app: Application): void => {
  app.post("/login", login);

  app.post("/user/uploadImage", upload.single("image"), uploadImage);

  app.post("/user/registerMember", upload.single("image"), registerMember);

  app.get("/user/getMembers", getMembers);

  app.get("/user/editMember/:id", editMember);

  app.patch("/user/deleteMember/:id", deleteMember);

  app.put("/user/updateMember/:id", upload.single("image"), updateMember);

  app.post("/user/addDistrict", addDistrict);
 
  app.get("/user/getDistrict", getDistrict);
 
  app.put("/user/updateDistrict/:id", updateDistrict);
 
  app.patch("/user/deleteDistrict/:id", deleteDistrict);
 
  app.get("/user/getZoneById/:id", getZoneById);
 
  app.get("/user/getZone", getZonessss);
 
  app.post("/user/addZone", addZones);
 
  app.put("/user/updateZone/:id", updateZone);
 
  app.patch("/user/deleteZone/:id", deleteZone);
 

  app.post("/user/addEvent", upload.single("image"), addEvent);

  app.get("/user/getEvent", getEvent);

  app.put("/user/updateEvent/:id", upload.single("image"), updateEvent);

  app.patch("/user/deleteEvent/:id", deleteEvent);

  app.get("/user/searchEvent", searchEvent);

  app.get("/user/getEventById/:id", getEventById);

  app.post("/user/startEvent/:eventId", startEvent);

  app.get("/user/searchMember", searchMember);

  app.post("/user/joinEvent/:eventId/:memberId", joinEvent);

  app.get("/user/getJoinMembers/:eventId", getJoinMembers);

  app.get("/user/searchEventDetail", searchEventDetail);

  app.post("/user/endEvent/:id", endEvent);

  app.get("/user/getLeaveMembers/:eventId", getLeaveMembers);

  app.get("/user/getEndMembers/:eventId", getEndMembers);

  app.get("/user/searchDistricts", searchDistricts);

  app.get("/user/searchZones", searchZones);

  app.get("/user/membersReport", membersReport);

  app.get("/user/eventReport", EventReport);

  app.get("/user/individualMemberReport", eventDetailReport);

  app.get("/user/searchIndividualPresent", searchIndividualPresent);

  app.get("/user/download-report", downloadReportPdf);
};
