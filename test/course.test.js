const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../index"); // Adjust path if needed
const { expect } = chai;

chai.use(chaiHttp);

// We'll store two tokens: one for admin (for course creation/deletion)
// and one for a student (for enrollment operations)
let adminToken = "";
let adminId = "";
let studentToken = "";
let studentId = "";
let courseId = "";

describe("Course API Tests", function () {
    this.timeout(15000); // Increase timeout if needed

    // Setup: Log in (or register if needed) both an admin and a student
    before(async function () {
        // ADMIN SETUP
        try {
            // Try logging in as admin
            let res = await chai.request(app)
                .post("/auth/login")
                .send({
                    email: "admin7@gmail.com",
                    password: "admin123"
                });
            if (res.status === 200 && res.body.token) {
                adminToken = res.body.token;
                adminId = res.body.user._id;
                console.log("Admin login successful:", adminId);
            }
        } catch (error) {
            // If login fails, register admin and then log in
            try {
                let res = await chai.request(app)
                    .post("/auth/register")
                    .send({
                        name: "Admin User",
                        email: "admin7@gmail.com",
                        password: "admin123",
                        phone: "1234567890",
                        role: "Admin"
                    });
                expect(res).to.have.status(201);
                adminId = res.body.user._id;
                // Now log in
                res = await chai.request(app)
                    .post("/auth/login")
                    .send({
                        email: "admin7@gmail.com",
                        password: "admin123"
                    });
                expect(res).to.have.status(200);
                adminToken = res.body.token;
                console.log("Admin registered & logged in:", adminId);
            } catch (err) {
                console.error("Admin setup error:", err.response ? err.response.body : err);
                throw err;
            }
        }

        // STUDENT SETUP
        try {
            // Try logging in as student
            let res = await chai.request(app)
                .post("/user/login")
                .send({
                    email: "student@test.com",
                    password: "student123"
                });
            if (res.status === 200 && res.body.token) {
                studentToken = res.body.token;
                studentId = res.body.user._id;
                console.log("Student login successful:", studentId);
            }
        } catch (error) {
            // If login fails, register student and then log in
            try {
                let res = await chai.request(app)
                    .post("/user/register")
                    .send({
                        name: "Test Student",
                        email: "student@test.com",
                        password: "student123",
                        phone: "1112223333",
                        role: "Student"
                    });
                expect(res).to.have.status(201);
                // Now log in
                res = await chai.request(app)
                    .post("/user/login")
                    .send({
                        email: "student@test.com",
                        password: "student123"
                    });
                expect(res).to.have.status(200);
                studentToken = res.body.token;
                studentId = res.body.user._id;
                console.log("Student registered & logged in:", studentId);
            } catch (err) {
                console.error("Student setup error:", err.response ? err.response.body : err);
                throw err;
            }
        }
    });

    // Test: Create a new course (Admin only)
    it("should create a new course", async function () {
        const res = await chai.request(app)
            .post("/courses/create")
            // Send form-data fields
            .field("title", "Test Course")
            .field("description", "This is a test course")
            .field("videoUrl", "https://example.com/video")
            .field("price", "99.99")
            // Attach an image file (ensure the file exists at the given path)
            .attach("file", "./test/testCourseImage.jpg");

        console.log("Create Course Response:", res.body);
        expect(res).to.have.status(201);
        expect(res.body).to.have.property("message", "Course created successfully");
        expect(res.body).to.have.property("course");
        courseId = res.body.course._id;
        expect(courseId).to.exist;
    });

    // Test: Get all courses (Public endpoint)
    it("should get all courses", async function () {
        const res = await chai.request(app)
            .get("/courses/all");
        console.log("Get All Courses Response:", res.body);
        expect(res).to.have.status(200);
        expect(res.body).to.be.an("array");
    });

    // Test: Get a specific course by ID (Public endpoint)
    it("should get a course by ID", async function () {
        const res = await chai.request(app)
            .get(`/courses/${courseId}`);
        console.log("Get Course by ID Response:", res.body);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("_id", courseId);
    });

    // Test: Enroll a student in the course (Protected: Student token)
    it("should enroll a student in the course", async function () {
        const res = await chai.request(app)
            .post(`/courses/${courseId}/enroll`)
            .set("Authorization", `Bearer ${studentToken}`);
        console.log("Enroll Student Response:", res.body);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Successfully enrolled in course");
        expect(res.body).to.have.property("enrollment");
    });

    // Test: Check enrollment status (Protected: Student token)
    it("should check enrollment status", async function () {
        const res = await chai.request(app)
            // The route expects userId and courseId as parameters; we use studentId here
            .get(`/courses/enrollment/check/${studentId}/${courseId}`)
            .set("Authorization", `Bearer ${studentToken}`);
        console.log("Check Enrollment Response:", res.body);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("enrolled", true);
    });

    // Test: Delete the course (Admin only)
    it("should delete the course", async function () {
        const res = await chai.request(app)
            .delete(`/courses/delete/${courseId}`)
            .set("Authorization", `Bearer ${adminToken}`); // Optionally, add auth if needed for deletion
        console.log("Delete Course Response:", res.body);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Course deleted successfully");
    });
});
