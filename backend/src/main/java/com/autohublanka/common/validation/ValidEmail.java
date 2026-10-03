package com.autohublanka.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Strict email format used on every form (the built-in @Email also accepts addresses such as "a@b").
 * Accepts name@gmail.com, first.last@company.co.uk, name+tag@mail.lk ...
 * Rejects missing @, missing domain dot, spaces, double dots and a dot at the start or end of the name.
 * The same rule is used by the React forms (src/utils/validation.js). A null value is valid -
 * combine with @NotBlank when the email is required.
 */
@Documented
@Constraint(validatedBy = {})
@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
@ReportAsSingleViolation
@Pattern(regexp = ValidEmail.REGEX)
public @interface ValidEmail {

    String REGEX = "^$|^[A-Za-z0-9_%+-]+(\\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*\\.[A-Za-z]{2,}$";

    String message() default "Enter a valid email address (e.g. name@gmail.com)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
