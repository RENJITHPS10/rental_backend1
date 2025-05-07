const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const cors=require('cors')
dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors())

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/owners', require('./routes/ownerRoutes'));



const PORT = process.env.PORT || 5000;  
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));