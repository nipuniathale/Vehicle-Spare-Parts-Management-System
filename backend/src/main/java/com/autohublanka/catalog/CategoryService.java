package com.autohublanka.catalog;

import com.autohublanka.catalog.dto.CategoryRequest;
import com.autohublanka.catalog.dto.CategoryResponse;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final SparePartRepository sparePartRepository;

    public CategoryService(CategoryRepository categoryRepository, SparePartRepository sparePartRepository) {
        this.categoryRepository = categoryRepository;
        this.sparePartRepository = sparePartRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findAll(boolean activeOnly) {
        var categories = activeOnly
                ? categoryRepository.findByActiveTrueOrderByNameAsc()
                : categoryRepository.findAllByOrderByNameAsc();
        return categories.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse findById(Long id) {
        return toResponse(getCategory(id));
    }

    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A category named '" + name + "' already exists");
        }
        Category category = new Category();
        apply(category, request);
        return toResponse(categoryRepository.save(category));
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getCategory(id);
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("A category named '" + name + "' already exists");
        }
        apply(category, request);
        return toResponse(categoryRepository.save(category));
    }

    public void delete(Long id) {
        Category category = getCategory(id);
        long parts = sparePartRepository.countByCategoryId(id);
        if (parts > 0) {
            throw new ConflictException("Category '" + category.getName() + "' still has " + parts
                    + " spare part(s). Move them to another category or delete them first.");
        }
        categoryRepository.delete(category);
    }

    private void apply(Category category, CategoryRequest request) {
        category.setName(request.name().trim());
        category.setDescription(Text.clean(request.description()));
        category.setImageUrl(Text.clean(request.imageUrl()));
        category.setActive(request.active() == null || request.active());
    }

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.from(category, sparePartRepository.countByCategoryId(category.getId()));
    }

    private Category getCategory(Long id) {
        return categoryRepository.findById(id).orElseThrow(() -> NotFoundException.of("Category", id));
    }
}
