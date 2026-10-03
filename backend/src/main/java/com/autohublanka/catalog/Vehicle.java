package com.autohublanka.catalog;

import com.autohublanka.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "vehicles",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_vehicle_make_model_year_variant",
                columnNames = {"make", "model", "manufacture_year", "variant"}))
public class Vehicle extends BaseEntity {

    @Column(nullable = false, length = 60)
    private String make;

    @Column(nullable = false, length = 60)
    private String model;

    @Column(name = "manufacture_year", nullable = false)
    private int year;

    @Column(length = 60)
    private String variant;

    @Column(length = 40)
    private String engine;

    @Column(length = 500)
    private String imageUrl;

    public String getDisplayName() {
        String name = make + " " + model + " " + year;
        return variant == null || variant.isBlank() ? name : name + " " + variant;
    }

    public String getMake() { return make; }
    public void setMake(String make) { this.make = make; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant; }

    public String getEngine() { return engine; }
    public void setEngine(String engine) { this.engine = engine; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
