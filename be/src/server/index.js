import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import routes from '../routes/index.js';
import errorHandler from '../middlewares/error.js';

const app = express();

const corsOptions = {
    origin: [
        'https://table-flow-v-2.mr-mighdadjaba.workers.dev/', 
        'https://table-flow-v-2-admin.mr-mighdadjaba.workers.dev/', 
        'https://table-flow-v-2-customer.mr-mighdadjaba.workers.dev/', 
    ]
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use(routes);
app.use(errorHandler);

export default app;
