package com.autohublanka.catalog;

import com.autohublanka.catalog.dto.FitmentRequest;
import com.autohublanka.catalog.dto.FitmentResponse;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class FitmentService {

    private final FitmentRepository fitmentRepository;
    private final VehicleRepository vehicleRepository;
    private final SparePartRepository sparePartRepository;

    public FitmentService(FitmentRepository fitmentRepository,
                          VehicleRepository vehicleRepository,
                          SparePartRepository sparePartRepository) {
        this.fitmentRepository = fitmentRepository;
        this.vehicleRepository = vehicleRepository;
        this.sparePartRepository = sparePartRepository;
    }

    @Transactional(readOnly = true)
    public List<FitmentResponse> findAll(Long vehicleId, Long sparePartId) {
        return fitmentRepository.search(vehicleId, sparePartId).stream()
                .map(FitmentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public FitmentResponse findById(Long id) {
        return FitmentResponse.from(getFitment(id));
    }

    public FitmentResponse create(FitmentRequest request) {
        if (fitmentRepository.existsByVehicleIdAndSparePartId(request.vehicleId(), request.sparePartId())) {
            throw new ConflictException("This part is already linked to this vehicle");
        }
        Fitment fitment = new Fitment();
        apply(fitment, request);
        return FitmentResponse.from(fitmentRepository.save(fitment));
    }

    public FitmentResponse update(Long id, FitmentRequest request) {
        Fitment fitment = getFitment(id);
        if (fitmentRepository.existsByVehicleIdAndSparePartIdAndIdNot(request.vehicleId(), request.sparePartId(), id)) {
            throw new ConflictException("This part is already linked to this vehicle");
        }
        apply(fitment, request);
        return FitmentResponse.from(fitmentRepository.save(fitment));
    }

    public void delete(Long id) {
        fitmentRepository.delete(getFitment(id));
    }

    private void apply(Fitment fitment, FitmentRequest request) {
        fitment.setVehicle(vehicleRepository.findById(request.vehicleId())
                .orElseThrow(() -> NotFoundException.of("Vehicle", request.vehicleId())));
        fitment.setSparePart(sparePartRepository.findById(request.sparePartId())
                .orElseThrow(() -> NotFoundException.of("Spare part", request.sparePartId())));
        fitment.setNotes(Text.clean(request.notes()));
    }

    private Fitment getFitment(Long id) {
        return fitmentRepository.findById(id).orElseThrow(() -> NotFoundException.of("Fitment", id));
    }
}
