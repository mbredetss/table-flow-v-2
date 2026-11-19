import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import routes from '../routes/index.js';
import errorHandler from '../middlewares/error.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use(routes);
app.use(errorHandler);

export default app;
