class AppError extends Error { // Đây là class cha của các lỗi, nó sẽ có các thuộc tính sau:
    constructor(message, statusCode, errorCode) { // message: thông báo lỗi, statusCode: mã trạng thái HTTP, errorCode: mã lỗi
        super(message); // message: thông báo lỗi, super() gọi đến constructor của class cha là Error nghĩa là muốn kế thừa với thuộc tính nào của class cha
        this.statusCode = statusCode; // statusCode: mã trạng thái HTTP
        this.errorCode = errorCode || 'INTERNAL_ERROR'; // errorCode: mã lỗi
        this.isOperational = true; // isOperational: cờ đánh dấu lỗi do người dùng gây ra
        Error.captureStackTrace(this, this.constructor); // captureStackTrace: để ghi lại stack trace việc thêm tham số thứ 2 là bỏ việc hiển thị lỗi tại class AppError
        // this là 1 instance của class AppError, this.constructor là class AppError
    }
}

class BadRequestError extends AppError { // 400: Bad Request
    constructor(message = 'Bad Request') {
        super(message, 400, 'BAD_REQUEST');
    }
}

class UnauthorizedError extends AppError { // 401: Unauthorized
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError { // 403: Forbidden
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

class NotFoundError extends AppError { // 404: Not Found
    constructor(message = 'Not Found') {
        super(message, 404, 'NOT_FOUND');
    }
}

class ConflictError extends AppError { // 409: Conflict
    constructor(message = 'Conflict') {
        super(message, 409, 'CONFLICT');
    }
}

class InternalError extends AppError { // 500: Internal Server Error
    constructor(message = 'Internal Server Error') {
        super(message, 500, 'INTERNAL_ERROR');
    }
}

module.exports = { // export các class lỗi
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    InternalError,
};
