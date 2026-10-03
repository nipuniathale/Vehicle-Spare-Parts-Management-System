package com.autohublanka.catalog;

import com.autohublanka.catalog.dto.VehicleRequest;
import com.autohublanka.catalog.dto.VehicleResponse;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final FitmentRepository fitmentRepository;

    public VehicleService(VehicleRepository vehicleRepository, FitmentRepository fitmentRepository) {
        this.vehicleRepository = vehicleRepository;
        this.fitmentRepository = fitmentRepository;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findAll() {
        return vehicleRepository.findAllByOrderByMakeAscModelAscYearDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse findById(Long id) {
        return toResponse(getVehicle(id));
    }

    public VehicleResponse create(VehicleRequest request) {
        validate(request, null);
        Vehicle vehicle = new Vehicle();
        apply(vehicle, request);
        return toResponse(vehicleRepository.save(vehicle));
    }

    public VehicleResponse update(Long id, VehicleRequest request) {
        Vehicle vehicle = getVehicle(id);
        validate(request, id);
        apply(vehicle, request);
        return toResponse(vehicleRepository.save(vehicle));
    }

    /** Deleting a vehicle also deletes its fitment rows (they only describe this vehicle). */
    public void delete(Long id) {
        Vehicle vehicle = getVehicle(id);
        fitmentRepository.deleteByVehicleId(id);
        vehicleRepository.delete(vehicle);
    }

    private void validate(VehicleRequest request, Long currentId) {
        int maxYear = Year.now().getValue() + 1;
        if (request.year() > maxYear) {
            throw new BusinessException("Year cannot be later than " + maxYear);
        }

        String variant = Text.clean(request.variant());
        boolean duplicate = vehicleRepository
                .findByMakeIgnoreCaseAndModelIgnoreCaseAndYear(request.make().trim(), request.model().trim(), request.year())
                .stream()
                .filter(v -> !v.getId().equals(currentId))
                .anyMatch(v -> Objects.equals(
                        v.getVariant() == null ? null : v.getVariant().toLowerCase(),
                        variant == null ? null : variant.toLowerCase()));
        if (duplicate) {
            throw new ConflictException("This vehicle (make, model, year and variant) already exists");
        }
    }

    private void apply(Vehicle vehicle, VehicleRequest request) {
        vehicle.setMake(request.make().trim());
        vehicle.setModel(request.model().trim());
        vehicle.setYear(request.year());
        vehicle.setVariant(Text.clean(request.variant()));
        vehicle.setEngine(Text.clean(request.engine()));
        vehicle.setImageUrl(Text.clean(request.imageUrl()));
    }

    private VehicleResponse toResponse(Vehicle vehicle) {
        return VehicleResponse.from(vehicle, fitmentRepository.countByVehicleId(vehicle.getId()));
    }

    private Vehicle getVehicle(Long id) {
        return vehicleRepository.findById(id).orElseThrow(() -> NotFoundException.of("Vehicle", id));
    }
}
