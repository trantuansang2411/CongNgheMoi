const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../.env' }); // Adjust if needed

const UserProfile = require('../src/models/mongoose/UserProfile.model');
const InstructorProfile = require('../src/models/mongoose/InstructorProfile.model');
const InstructorApplication = require('../src/models/mongoose/InstructorApplication.model');

// Load env config from the common structure, default to MongoDB localhost
let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

// If running outside Docker, 'mongodb' hostname might not be resolvable, fallback to localhost
if (MONGO_URI.includes('mongodb://mongodb:27017')) {
    MONGO_URI = 'mongodb://localhost:27017';
}

const DB_NAME = 'user_db';

// Define reasonable quantities
const NUM_STUDENTS = 50;
const NUM_INSTRUCTORS = 10;
const NUM_APPLICATIONS = 15;

async function seed() {
    try {
        console.log(`Connecting to MongoDB: ${MONGO_URI}/${DB_NAME}`);
        await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
        console.log('Connected to MongoDB. Clearing existing collections...');

        await UserProfile.deleteMany({});
        await InstructorProfile.deleteMany({});
        await InstructorApplication.deleteMany({});
        
        console.log('Collections cleared.');

        // 1. Seed Students (Users)
        console.log(`Seeding ${NUM_STUDENTS} students (UserProfile)...`);
        const userProfiles = [];
        for (let i = 1; i <= NUM_STUDENTS; i++) {
            userProfiles.push({
                userId: uuidv4(),
                fullName: `Học viên ${i}`,
                avatarUrl: `https://ui-avatars.com/api/?name=Hoc+Vien+${i}&background=random`,
                phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
                bio: `Xin chào, tôi là sinh viên đam mê công nghệ. Tôi muốn học hỏi nhiều thứ mới mẻ. Đây là hồ sơ học viên của Học viên ${i}.`
            });
        }
        await UserProfile.insertMany(userProfiles);

        // 2. Seed Instructors
        console.log(`Seeding ${NUM_INSTRUCTORS} instructors (InstructorProfile and UserProfile)...`);
        const instructorNames = [
            "Nguyễn Công Tuấn", "Lê Hữu Đạt", "Trần Anh Khoa", "Thái Yên", 
            "Phạm Minh Hoàng", "Vũ Thị Mai", "Trần Hữu Kiên", "Đinh Văn Dũng", 
            "Lê Tuấn Hùng", "Mai Anh Tuấn"
        ];
        
        const instructorProfiles = [];
        const instructorUserProfiles = [];

        for (let i = 0; i < NUM_INSTRUCTORS; i++) {
            const instId = uuidv4();
            const displayName = instructorNames[i] || `Giảng viên ${i + 1}`;
            
            instructorUserProfiles.push({
                userId: instId,
                fullName: displayName,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
                phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
                bio: `Xin chào, tôi là giảng viên ${displayName}, chuyên giảng dạy các khóa học CNTT.`
            });

            instructorProfiles.push({
                userId: instId,
                displayName: displayName,
                headline: "Chuyên gia phát triển phần mềm và kiến trúc hệ thống",
                payoutInfo: {
                    bankName: ["Vietcombank", "Techcombank", "MBBank"][Math.floor(Math.random() * 3)],
                    accountNumber: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                    accountHolder: displayName.toUpperCase()
                },
                status: 'ACTIVE'
            });
        }

        // Insert User Profiles for the instructors as well
        await UserProfile.insertMany(instructorUserProfiles);
        // Insert Instructor Profiles
        await InstructorProfile.insertMany(instructorProfiles);

        // 3. Seed Instructor Applications
        console.log(`Seeding ${NUM_APPLICATIONS} instructor applications...`);
        const applications = [];
        const applicationsUserProfiles = [];
        const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

        for (let i = 1; i <= NUM_APPLICATIONS; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const applicantUserId = uuidv4();

            applicationsUserProfiles.push({
                userId: applicantUserId,
                fullName: `Ứng viên Giảng viên ${i}`,
                avatarUrl: `https://ui-avatars.com/api/?name=Ung+Vien+${i}&background=random`,
                phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
                bio: `Tôi nộp đơn ứng tuyển cho vị trí giảng viên mới.`
            });

            applications.push({
                userId: applicantUserId,
                data: {
                    fullName: `Ứng viên Giảng viên ${i}`,
                    birthDate: new Date(1990 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                    headline: "Lập trình viên đam mê chia sẻ kiến thức",
                    experience: `${Math.floor(Math.random() * 10) + 1} năm kinh nghiệm làm việc thực tế`,
                    expertise: ["Backend Development", "Frontend Development", "DevOps", "Mobile App Development"][Math.floor(Math.random() * 4)],
                    educationLevel: ["Đại học", "Thạc sĩ", "Tiến sĩ"][Math.floor(Math.random() * 3)],
                    teachingTopics: ["Node.js", "React", "AWS", "Docker"],
                    portfolioUrl: "https://github.com/applicant_profile",
                    certificateUrls: ["https://example.com/cert.jpg"]
                },
                status: status,
                reviewerId: status !== 'PENDING' ? uuidv4() : null, // if reviewed, give a random reviewer id
                reviewedAt: status !== 'PENDING' ? new Date() : null
            });
        }

        await UserProfile.insertMany(applicationsUserProfiles);
        await InstructorApplication.insertMany(applications);

        console.log(`\n✅ Database Seeding Successfully Completed!`);
        console.log(`- ${NUM_STUDENTS + NUM_INSTRUCTORS + NUM_APPLICATIONS} UserProfiles Generated (Students: ${NUM_STUDENTS}, Instructors: ${NUM_INSTRUCTORS}, Applicants: ${NUM_APPLICATIONS})`);
        console.log(`- ${NUM_INSTRUCTORS} InstructorProfiles Generated`);
        console.log(`- ${NUM_APPLICATIONS} InstructorApplications Generated`);

        // Close connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);

    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

seed();
