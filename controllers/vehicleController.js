const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const cloudinary = require('cloudinary').v2;
exports.addVehicle = async (req, res) => {
  const {
    type,
    category,
    model,
    fuelType,
    seatingCapacity,
    price,
    location,
    registration,
  } = req.body;

  try {
    // Basic validation
    if (!type || !model || !fuelType || !price || !registration) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const existingVehicle = await Vehicle.findOne({ registration });
    if (existingVehicle) {
      return res.status(400).json({ msg: 'Vehicle already exists' });
    }

    // Handle vehicle images (max 10)
    let images = [];
    if (req.files && req.files['images']) {
      images = Array.isArray(req.files['images'])
        ? req.files['images'].map((file) => file.path)
        : [req.files['images'].path];
    }

    // Handle insurance image (max 1)
    const insuranceImage = req.files && req.files['insuranceImage']
      ? req.files['insuranceImage'][0].path
      : null;

    if (!insuranceImage) {
      return res.status(400).json({ msg: 'Insurance image is required' });
    }

    // Handle pollution image (max 1)
    const pollutionImage = req.files && req.files['pollutionImage']
      ? req.files['pollutionImage'][0].path
      : null;

    // Optional: Make pollutionImage required
    if (!pollutionImage) {
      return res.status(400).json({ msg: 'Pollution certificate image is required' });
    }

    const vehicle = new Vehicle({
      owner: req.user.id,
      type,
      category,
      model,
      fuelType,
      seatingCapacity: Number(seatingCapacity),
      price: Number(price),
      location,
      registration,
      insuranceImage,
      pollutionImage, // Add pollutionImage to the vehicle object
      images,
    });

    await vehicle.save();
    res.status(201).json({ msg: 'Vehicle added', vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
exports.getVehicles = async (req, res) => {
  try {
    const { location, priceMax, type, fuelType, all } = req.query;
    let query = req.user?.role === 'admin' && all === 'true' ? {} : { availability: true, isApproved: true };

    if (location) query.location = { $regex: location, $options: 'i' };
    if (priceMax) query.price = { $lte: Number(priceMax) };
    if (type) query.type = type;
    if (fuelType) query.fuelType = fuelType;

    const vehicles = await Vehicle.find(query).populate('owner', 'name');
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getOwnerVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id }).populate('owner', 'name');
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateVehicle = async (req, res) => {
  const { price, availability } = req.body;

  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || vehicle.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    let images = vehicle.images;
    if (req.files && req.files['images']) {
      images = req.files['images'].map(file => file.path);
    }
    const insuranceImage = req.files['insuranceImage'] ? req.files['insuranceImage'][0].path : vehicle.insuranceImage;

    vehicle.price = price || vehicle.price;
    vehicle.availability = availability !== undefined ? availability : vehicle.availability;
    vehicle.images = images;
    vehicle.insuranceImage = insuranceImage;
    await vehicle.save();

    res.json({ msg: 'Vehicle updated', vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteVehicle = async (req, res) => {


  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || vehicle.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    if (vehicle.images.length) {
      for (const image of vehicle.images) {
        const publicId = image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`vehicle_files/${publicId}`);
      }
    }
    if (vehicle.insuranceImage) {
      const publicId = vehicle.insuranceImage.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`vehicle_files/${publicId}`);
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Vehicle deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.rateVehicle = async (req, res) => {
  const { rating } = req.body;
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('vehicle');
    console.log('Booking:', booking);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const vehicle = booking.vehicle;
    console.log('Vehicle:', vehicle);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });

    vehicle.rating = vehicle.rating ? (vehicle.rating + rating) / 2 : rating;
    await vehicle.save();
    res.json({ msg: 'Vehicle rated', vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getOwnerVehicleReviews = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id }).select('model rating');
    if (!vehicles.length) {
      return res.status(404).json([]); // Return empty array instead of error
    }

    const reviews = vehicles.map((vehicle) => ({
      _id: vehicle._id, // Use _id for consistency with frontend
      vehicle: { model: vehicle.model }, // Match frontend structure
      vehicleRating: vehicle.rating || 0, // Default to 0 if not rated
      vehicleComment: 'Not rated yet', // Placeholder if no comment exists
    }));

    res.json(reviews); // Return array directly
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.approveVehicle = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });

    vehicle.isApproved = true;
    vehicle.rejectionReason = null;
    await vehicle.save();

    res.json({ msg: 'Vehicle approved', vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.rejectVehicle = async (req, res) => {
  const { reason } = req.body;

  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });

    vehicle.isApproved = false;
    vehicle.rejectionReason = reason || 'No reason provided';
    await vehicle.save();

    res.json({ msg: 'Vehicle rejected', vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
exports.getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('owner', 'name');
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }

    // Optionally restrict access (e.g., only admins, owners, or authenticated users can view)
    if (req.user.role !== 'admin' && vehicle.owner.toString() !== req.user.id) {
      // Check if the vehicle is available and approved for non-owners/admins
      if (!vehicle.availability || !vehicle.isApproved) {
        return res.status(403).json({ msg: 'Vehicle not available or not approved' });
      }
    }

    res.json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};