const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const buildSlug = (title) => slugify(title, { lower: true, strict: true, locale: 'vi' });

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[getRandomInt(0, arr.length - 1)];
}

const instructors = [
  { instructorId: uuidv4(), displayName: "Nguyễn Công Tuấn" },
  { instructorId: uuidv4(), displayName: "Lê Hữu Đạt" },
  { instructorId: uuidv4(), displayName: "Trần Anh Khoa" },
  { instructorId: uuidv4(), displayName: "Thái Yên" },
  { instructorId: uuidv4(), displayName: "Phạm Minh Hoàng" },
  { instructorId: uuidv4(), displayName: "Vũ Thị Mai" }
];

const videoUrls = [
  "https://www.youtube.com/embed/ROTozxg5bu8",
  "https://www.youtube.com/embed/KTIUgdGwJXE",
  "https://www.youtube.com/embed/3JluqTojuME",
  "https://www.youtube.com/embed/9w6gO6v9f0w",
  "https://www.youtube.com/embed/Ke90Tje7VS0",
  "https://www.youtube.com/embed/6mbwJ2xhgzM",
  "https://www.youtube.com/embed/kqtD5dpn9C8",
  "https://www.youtube.com/embed/MF7x8R2xYOs",
  "https://www.youtube.com/embed/Oe421EPjeBE",
  "https://www.youtube.com/embed/5qap5aO4i9A",
  "https://www.youtube.com/embed/TlB_eWDSMt4",
  "https://www.youtube.com/embed/pQN-pnXPaVg",
  "https://www.youtube.com/embed/Z1Yd7upQsXY",
  "https://www.youtube.com/embed/W6NZfCO5SIk"
];

const thumbnails = [
  "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  "https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
];

const courseTemplates = [
  { title: "Node.js Microservices Thực Chiến", topicId: "backend" },
  { title: "Xây Dựng Ứng Dụng ReactJS Toàn Diện", topicId: "frontend" },
  { title: "Master Kubernetes và Docker", topicId: "devops" },
  { title: "Tối Ưu Hoá Hiệu Năng PostgreSQL", topicId: "database" },
  { title: "Ứng Dụng Đa Nền Tảng Chuyên Nghiệp Với Flutter", topicId: "mobile" },
  { title: "NestJS Cơ Bản Đến Nâng Cao", topicId: "backend" },
  { title: "VueJS 3 - Xây Dựng SPA Đỉnh Cao", topicId: "frontend" },
  { title: "AWS Cloud cho Lập Trình Viên Backend", topicId: "devops" },
  { title: "Bảo Mật Hệ Thống Web API", topicId: "backend" },
  { title: "Thiết Kế Cơ Sở Dữ Liệu SQL Từ A-Z", topicId: "database" },
  { title: "React Native và Viết App Bán Hàng", topicId: "mobile" },
  { title: "Golang Cho Microservices", topicId: "backend" },
  { title: "Làm Chủ HTML5, CSS3, JS Vanilla", topicId: "frontend" },
  { title: "CI/CD Với Jenkins và GitLab", topicId: "devops" },
  { title: "Redis và Caching Core", topicId: "database" },
  { title: "Phân Tích Thiết Kế Hệ Thống E-commerce", topicId: "backend" },
  { title: "Học Nhanh FastAPI Python", topicId: "backend" },
  { title: "UI/UX và Phát Triển Frontend với Tailwind CSS", topicId: "frontend" },
  { title: "Học MongoDB với Mongoose Express", topicId: "database" },
  { title: "Tìm Hiểu Ngôn Ngữ Swift App iOS", topicId: "mobile" }
];

const sectionNames = [
  "Cài đặt và thiết lập nhanh",
  "Khám phá các tính năng cơ bản",
  "Kiến trúc và thiết kế",
  "Xử lý dữ liệu và State",
  "Ví dụ thực tiễn",
  "Kết nối với API",
  "Tối ưu hiệu suất ứng dụng",
  "Bảo mật và Authorization",
  "Triển khai (Deployment)",
  "Ôn tập và dự án cuối khóa"
];

const lessonPrefixes = [
  "Giới thiệu chung về",
  "Hướng dẫn cài đặt",
  "Các khái niệm nền tảng trong",
  "Thực hành ứng dụng",
  "Phân tích lỗi và fix bug cho",
  "Thiết lập cấu hình nâng cao trong",
  "Quy trình xử lý của",
  "Kinh nghiệm làm việc với",
  "Chia sẻ thực tế về",
  "Bài tập cuối chương"
];

const generatedCourses = [];

for (let i = 0; i < courseTemplates.length; i++) {
  const tpl = courseTemplates[i];
  const instructor = getRandomItem(instructors);
  const totalSections = getRandomInt(5, 8);
  const sections = [];

  for (let sIdx = 0; sIdx < totalSections; sIdx++) {
    const totalLessons = getRandomInt(4, 6);
    const lessons = [];

    for (let lIdx = 0; lIdx < totalLessons; lIdx++) {
      const isPreview = sIdx === 0 && lIdx === 0;
      lessons.push({
        lessonId: uuidv4(),
        title: `Bài ${lIdx + 1}: ${getRandomItem(lessonPrefixes)} ${tpl.topicId}`,
        orderIndex: lIdx,
        durationSec: getRandomInt(300, 1200), // 5p - 20p
        isPreview: isPreview,
        videoUrl: getRandomItem(videoUrls)
      });
    }

    sections.push({
      sectionId: uuidv4(),
      title: `Chương ${sIdx + 1}: ${getRandomItem(sectionNames)}`,
      orderIndex: sIdx,
      lessons: lessons
    });
  }

  generatedCourses.push({
    courseId: uuidv4(),
    title: tpl.title,
    slug: buildSlug(tpl.title),
    description: `Khoá học chuyên sâu về ${tpl.title}, giúp bạn nắm bắt công nghệ kiến trúc ${tpl.topicId} thực tế với trải nghiệm dễ hiểu nhất.`,
    objectives: [
      "Hiểu rõ kiến trúc và nền tảng",
      "Sẵn sàng nộp đơn phỏng vấn tại các tập đoàn lớn",
      "Triển khai dự án thực tế"
    ],
    requirements: [
      "Biết sử dụng máy tính cơ bản",
      "Đam mê lập trình",
      "Một số kiến thức căn bản về web"
    ],
    outcomes: [
      "Lập trình viên độc lập",
      "Tối ưu code chuyên nghiệp"
    ],
    topicId: tpl.topicId,
    thumbnailUrl: getRandomItem(thumbnails),
    basePrice: getRandomInt(500, 1000) * 1000,
    salePrice: getRandomInt(200, 490) * 1000,
    currency: "VND",
    status: "PUBLISHED",
    instructorId: instructor.instructorId,
    instructorName: instructor.displayName,
    sections: sections
  });
}

const finalData = {
  instructors: instructors,
  courses: generatedCourses
};

fs.writeFileSync(
  path.join(__dirname, '..', 'seed-courses.json'),
  JSON.stringify(finalData, null, 4)
);

console.log(`Đã tạo thành công ${generatedCourses.length} khóa học mẫu và ${instructors.length} giảng viên thật!`);
