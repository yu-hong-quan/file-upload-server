const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors()); // 允许跨域请求

// 定义上传目录路径
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');//切片文件目录
const MERGED_DIR = path.resolve(__dirname, 'merged');//切片合并后的文件目录

app.use(express.json()); // 解析 JSON 请求体

// 路由处理文件切片上传
app.post('/upload', upload.single('file'), (req, res) => {
    const { chunkIndex, totalChunks, fileName } = req.body; // 从请求体中获取切片索引、总切片数和文件名
    const chunkPath = path.join(UPLOAD_DIR, `${fileName}-${chunkIndex}`); // 构造切片文件路径

    // 将临时上传的切片文件重命名并移动到上传目录
    fs.renameSync(req.file.path, chunkPath);

    res.sendStatus(200); // 响应客户端请求
});

// 路由处理已上传的切片查询
app.get('/uploadedChunks', (req, res) => {
    const { fileName } = req.query; // 从查询参数中获取文件名
    const uploadedChunks = [];

    // 查找上传目录中已存在的切片文件
    fs.readdirSync(UPLOAD_DIR).forEach(file => {
        const match = file.match(new RegExp(`${fileName}-(\\d+)`)); // 匹配文件名
        if (match) {
            uploadedChunks.push(Number(match[1])); // 将切片索引添加到数组
        }
    });

    res.json(uploadedChunks); // 返回已上传的切片索引
});

// 路由处理文件合并
app.post('/merge', async (req, res) => {
    const { fileName, totalChunks } = req.body; // 从请求体中获取文件名和总切片数
    const mergedFilePath = path.join(MERGED_DIR, fileName); // 构造合并后的文件路径

    // 确保合并目录存在
    if (!fs.existsSync(MERGED_DIR)) {
        fs.mkdirSync(MERGED_DIR);
    }

    const writeStream = fs.createWriteStream(mergedFilePath); // 创建写入流

    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(UPLOAD_DIR, `${fileName}-${i}`); // 当前切片路径
        const data = fs.readFileSync(chunkPath); // 读取当前切片数据
        writeStream.write(data); // 将切片数据写入目标文件
        fs.unlinkSync(chunkPath); // 删除当前切片文件
    }

    writeStream.end(); // 关闭写入流

    writeStream.on('finish', () => {
        res.json({ message: 'File merged successfully!', filePath: mergedFilePath }); // 响应客户端合并成功
    });
});

// 启动服务器并监听端口3000
app.listen(3000, () => {
    // 确保上传目录存在
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR);
    }
    console.log('Server started on http://localhost:3000');
});
