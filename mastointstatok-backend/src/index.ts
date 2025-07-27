import express from 'express';
import inboxRoutes from './routes/InboxRoutes';

const app = express();

app.use(express.json());
app.use(inboxRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
