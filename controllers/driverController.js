  const Booking = require('../models/Booking');
  const Driver = require('../models/Driver');
  const Vehicle = require('../models/Vehicle');
  const ConditionReport = require('../models/ConditionReport');
  const { calculateDistance } = require('../utils/calculateDistance');
  const mongoose = require('mongoose');


  exports.assignDriver = async (req, res) => {
    const { driverId } = req.body; // Admin provides driverId in request body

    try {
      // Restrict to admin only
      if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Only admins can assign drivers' });
      }

      // Validate driver
      const driver = await Driver.findOne({ user: driverId }).populate('user');
      if (!driver) {
        return res.status(404).json({ msg: 'Driver not found' });
      }
      if (!driver.availability) {
        return res.status(400).json({ msg: 'Driver is currently unavailable' });
      }
      if (driver.user.role !== 'driver') {
        return res.status(400).json({ msg: 'Selected user is not a driver' });
      }

      // Validate booking
      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) {
        return res.status(404).json({ msg: 'Booking not found' });
      }
      if (!booking.needsDriver) {
        return res.status(400).json({ msg: 'Booking does not require a driver' });
      }
      if (booking.driver) {
        return res.status(400).json({ msg: 'A driver is already assigned to this booking' });
      }
      if (booking.status !== 'approved' || !booking.ownerApproved) {
        return res.status(400).json({ msg: 'Booking must be approved by owner first' });
      }

      // Assign driver and update status
      booking.driver = driverId;
      booking.status = 'assigned'; // Set status to 'assigned'
      driver.availability = false;

      // Save changes
      await Promise.all([booking.save(), driver.save()]); // Save both in parallel

      res.status(200).json({ 
        msg: 'Driver assigned successfully', 
        booking: {
          _id: booking._id,
          vehicle: booking.vehicle,
          driver: driverId,
          status: booking.status,
          startDate: booking.startDate,
          endDate: booking.endDate,
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };
  exports.confirmDriverAssignment = async (req, res) => {
    try {
      const driver = await Driver.findOne({ user: req.user.id });
      if (!driver || req.user.role !== 'driver') {
        return res.status(403).json({ msg: 'Not authorized as a driver' });
      }

      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) {
        return res.status(404).json({ msg: 'Booking not found' });
      }
      if (booking.driver?.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Not assigned to this booking' });
      }
      if (booking.status !== 'assigned' || booking.driverConfirmed) {
        return res.status(400).json({ msg: 'Booking not eligible for confirmation' });
      }

      booking.driverConfirmed = true;
      booking.status = 'confirmed'; // Transition to confirmed
      await booking.save();

      res.json({ msg: 'Driver readiness confirmed', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };

  exports.completePickupDrop = async (req, res) => {
    try {
      const driver = await Driver.findOne({ user: req.user.id });
      if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });
      const booking = await Booking.findById(req.params.bookingId);
      if (!booking || booking.driver?.toString() !== req.user.id || !booking.driverConfirmed) return res.status(400).json({ msg: 'Booking not eligible' });
      booking.status = 'completed';
      const vehicle = await Vehicle.findById(booking.vehicle);
      vehicle.availability = false;
      driver.availability = true;
      await booking.save();
      await vehicle.save();
      await driver.save();
      res.json({ msg: 'Pickup/Drop completed', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };

  exports.reportCondition = async (req, res) => {

    const { condition, type } = req.body;
    console.log(condition)
    console.log(type)
    try {
      const booking = await Booking.findById(req.params.bookingId);
      if (!booking || booking.driver.toString() !== req.user.id) {
        return res.status(404).json({ msg: 'Booking not found or not yours' });
      }
      if (type === 'before' && booking.status !== 'pickup-confirmed') {
        return res.status(400).json({ msg: 'Can only report "before" when assigned' });
      }
      if (type === 'after' && booking.status !== 'completed') {
        return res.status(400).json({ msg: 'Can only report "after" after pickup confirmed' });
      }
      let images = req.files ? req.files.map(file => file.path) : [];
      const report = new ConditionReport({
        booking: req.params.bookingId,
        reportedBy: req.user.id,
        type,
        condition,
        images,
      });
      await report.save();
      booking.conditionReports.push(report._id);
      await booking.save();
      res.json({ msg: `Condition ${type} reported`, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };



  exports.getEarnings = async (req, res) => {
    try {
      // Check if user is a driver
      if (req.user.role !== 'driver') {
        return res.status(403).json({ msg: 'Not authorized as a driver' });
      }

      // Fetch completed bookings for this driver
      const bookings = await Booking.find({ driver: req.user.id, status: 'paid' }).populate(
        'vehicle',
        'model'
      );
  console.log(bookings)
      // Map earnings details
      const earningsDetails = bookings.map((booking) => ({
        bookingId: booking._id,
        vehicle: booking.vehicle?.model || 'N/A',
        amount: booking.driverFee || 0, // Use 'amount' for consistency
        date: booking.endDate, // Use endDate as the earning date
      }));

      // Calculate total earnings and completed bookings
      const totalEarnings = earningsDetails.reduce((sum, detail) => sum + detail.amount, 0);
      const completedBookings = earningsDetails.length;

      res.json({
        msg: 'Earnings retrieved',
        totalEarnings,
        completedBookings,
        details: earningsDetails,
      });
    } catch (err) {
      console.error('Error in getEarnings:', err.stack);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  };

  exports.rateDriver = async (req, res) => {
    const { rating } = req.body;

    try {
      const booking = await Booking.findById(req.params.bookingId);

      if (!booking || booking.customer._id.toString() !== req.user.id || !booking.driver || booking.rating) {
        return res.status(400).json({ msg: 'Booking not eligible' });
      }

      const driver = await Driver.findOne({ user: booking.driver });
      driver.averageRating = driver.averageRating ? (driver.averageRating + rating) / 2 : rating;
      booking.rating = rating;
      await driver.save();
      await booking.save();

      res.json({ msg: 'Driver rated', driver });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };

  exports.getCarLocation = async (req, res) => {
    try {
      const driver = await Driver.findOne({ user: req.user.id });
      if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

      const booking = await Booking.findById(req.params.bookingId).populate('vehicle', 'model');
      if (!booking || booking.driver?.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Not assigned to this booking' });
      }

      const location = {
        pickupLocation: booking.pickupLocation,
        dropLocation: booking.dropLocation,
        currentLocation: booking.currentLocation || null,
        vehicleModel: booking.vehicle?.model || 'N/A',
      };

      res.json({ msg: 'Car location retrieved', location });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };

  exports.updateCarLocation = async (req, res) => {
    const { latitude, longitude } = req.body;

    try {
      const driver = await Driver.findOne({ user: req.user.id });
      if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

      const booking = await Booking.findById(req.params.bookingId);
      if (!booking || booking.driver?.toString() !== req.user.id) {
        return res.status(404).json({ msg: 'Booking not found or not yours' });
      }

      booking.currentLocation = { latitude, longitude, updatedAt: new Date() };
      await booking.save();

      res.json({ msg: 'Location updated', location: booking.currentLocation });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };

  exports.getDriverBookings = async (req, res) => {
    try {
      const bookings = await Booking.find({ driver: req.user.id })
        .populate({
          path: 'customer',
          select: 'name email mobile', // Fetch customer name, email, phone
        })
        .populate({
          path: 'vehicle',
          populate: {
            path: 'owner',
            select: 'name email mobile', // Fetch owner name, email, phone
          },
        });

      if (!bookings || bookings.length === 0) {
        return res.status(404).json({ msg: 'No bookings found for this driver' });
      }

      res.json(bookings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };

  exports.getDriverReviews = async (req, res) => {
    try {
      // First check if user is a driver
      if (req.user.role !== 'driver') {
        return res.status(403).json({ msg: 'Not authorized as driver' });
      }

      // Find driver profile
      const driver = await Driver.findOne({ user: req.user.id });
      if (!driver) {
        return res.status(404).json({ msg: 'Driver profile not found' });
      }
  console.log(driver)
      // Find bookings for this driver
      const bookings = await Booking.find({ 
    driver:driver.user,
        status: 'paid',
        rating: { $exists: true, $ne: null } // Only get bookings with ratings
      })
      .populate('customer', 'name')
      .select('rating _id customer');

      console.log('Found bookings:', bookings); // Add this for debugging

      const reviews = bookings.map(booking => ({
        bookingId: booking._id,
        customer: booking.customer?.name || 'Unknown',
        rating: booking.rating
      }));

      res.json({
        msg: 'Driver reviews retrieved',
        averageRating: driver.averageRating || 'N/A',
        reviews
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  exports.getAvailableDrivers = async (req, res) => {
    const { bookingId } = req.query;
    console.log('Booking ID:', bookingId);

    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Only admins can view available drivers' });
      }

      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ msg: 'Invalid booking ID format' });
      }

      const booking = await Booking.findById(bookingId);
      console.log('Booking:', booking);
      if (!booking || !booking.pickupLocation) {
        return res.status(400).json({ msg: 'Invalid booking or missing pickup location' });
      }

      const drivers = await Driver.find({ availability: true }).populate('user', 'name email');
      console.log('Available Drivers:', drivers);

      const driversWithDistance = await Promise.all(
        drivers.map(async (driver, index) => {
          if (!driver.location) return { ...driver._doc, distance: null };
          await delay(index * 1000); // 1-second delay per request to respect Nominatim limits
          const distance = await calculateDistance(driver.location, booking.pickupLocation);
          console.log(`Distance from ${driver.location} to ${booking.pickupLocation}: ${distance}`);
          return { ...driver._doc, distance };
        })
      );

      driversWithDistance.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      res.json({
        pickupLocation: booking.pickupLocation,
        drivers: driversWithDistance,
      });
    } catch (err) {
      console.error('Error in getAvailableDrivers:', err.stack);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  };
  exports.getDriverProfile = async (req, res) => {
  
    try {

      const driver = await Driver.findOne({ user: req.user.id }).populate('user', 'name email');
      console.log(driver)
      if (!driver) {
        return res.status(404).json({ msg: 'Driver profile not found' });
      }
      res.json(driver);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };
  exports.updateDriver = async (req, res) => {
    const { location, availability } = req.body; // Fields to update
    const driverId = req.params.driverId;

    try {
      // Only allow admin or the driver themselves to update
      const driver = await Driver.findById(driverId).populate('user', 'role');
      if (!driver) {
        return res.status(404).json({ msg: 'Driver not found' });
      }
      if (req.user.role !== 'admin' && req.user.id !== driver.user._id.toString()) {
        return res.status(403).json({ msg: 'Not authorized to update this driver' });
      }

      // Update fields if provided
      if (location !== undefined) driver.location = location;
      if (availability !== undefined) driver.availability = availability;

      await driver.save();

      res.json({ msg: 'Driver updated successfully', driver });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };
  exports.confirmDriverPickupReadiness = async (req, res) => {


    try {
      const driver = await Driver.findOne({ user: req.user.id });
    
      if (!driver || req.user.role !== 'driver') {
        return res.status(403).json({ msg: 'Not authorized as a driver' });
      }

      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) {
        return res.status(404).json({ msg: 'Booking not found' });
      }
      if (booking.driver?.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Not assigned to this booking' });
      }
      if (booking.status !== 'assigned' || booking.driverConfirmed) {
        return res.status(400).json({ msg: 'Cannot confirm pickup readiness at this stage' });
      }

      booking.driverConfirmed = true; // Driver confirms readiness for pickup
      booking.status = 'pickup-confirmed'; // Transition to pickup-confirmed
      await booking.save();

      res.json({ msg: 'Pickup readiness confirmed', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  };