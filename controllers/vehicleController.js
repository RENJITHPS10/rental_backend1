const Vehicle = require('../models/Vehicle');

exports.addVehicle = async (req, res) => {
  const { type, category, model, fuelType, seatingCapacity, price, location, registration } = req.body;

  try {
    const existingVehicle = await Vehicle.findOne({ registration });
    if (existingVehicle) return res.status(400).json({ msg: 'Vehicle already exists' });

    let images = [];
    if (req.files && req.files['images']) {
      images = req.files['images'].map(file => file.path); // Cloudinary URLs
    }
    const insuranceImage = req.files['insuranceImage'] ? req.files['insuranceImage'][0].path : null;

    const vehicle = new Vehicle({
      owner: req.user.id,
      type,
      category,
      model,
      fuelType,
      seatingCapacity,
      price,
      location,
      registration,
      insuranceImage,
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
  const cloudinary = require('../config/cloudinary');

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
    const vehicle = await Vehicle.findById(req.params.id);
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
    if (!vehicles.length) return res.status(404).json({ msg: 'No vehicles found' });

    const reviews = vehicles.map(vehicle => ({
      vehicleId: vehicle._id,
      model: vehicle.model,
      rating: vehicle.rating || 'Not rated yet',
    }));

    res.json({ msg: 'Vehicle reviews retrieved', reviews });
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