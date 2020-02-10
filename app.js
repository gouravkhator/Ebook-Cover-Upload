const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const app = express();

app.set('view engine', 'ejs');
//Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

const mongoURI = 'mongodb+srv://user:Y8txPOrK64z93w4l@cluster0-naz12.mongodb.net/test?retryWrites=true&w=majority';
// const mongoURI= 'mongodb://localhost/ebooks';

//Create mongo connection
const conn = mongoose.createConnection(mongoURI, { useNewUrlParser: true });
//Init gfs
let gfs;
conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads'); //collection name uploads.files and uploads.chunks
});

//Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads' //same as collection name
                };
                resolve(fileInfo);
            });
        });
    }
});

const imageMimeTypes = ['image/jpeg', 'image/png'];
const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 3,
    },
    fileFilter: (req, file, callback) => {
        if (imageMimeTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback('Cannot upload non-image file', false);
        }
    }
});

app.get('/', (req, res) => {
    getFiles(res);
});

function getFiles(res, err = null) {
    gfs.files.find().toArray((err1, files) => {
        if (!files || files.length === 0) {
            res.render('index', { files: false, err });
        } else {
            files.reverse();
            res.render('index', { files, err });
        }
    });
}

app.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            getFiles(res, err);
        } else {
            const title = req.body.title;
            const description = req.body.description;
            gfs.files.update({ filename: req.file.filename }, {
                $set: {
                    metadata: {
                        title, description
                    }
                }
            });
            res.redirect('/');
        }
    });
});

//route for getting image and giving to img tag in index.ejs
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file) {
            return res.status(404).json({
                err: 'No File exists'
            });
        }

        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            //Read output to browser
            const readStream = gfs.createReadStream(file.filename);
            readStream.pipe(res);
        }
    });
});

app.delete('/images/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err) => {
        if (err) {
            return res.status(404).json({
                err
            });
        }
        res.redirect('/');
    }); //root is the collection name necessary to give
});

app.listen(5000, () => console.log(`Server started on port 5000`));
