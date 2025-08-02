package org.capsc.pdf.template.entity;

import jakarta.persistence.*;
import lombok.*;
import org.capsc.pdf.common.entity.BaseTimeEntity;

import java.util.UUID;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "templates")
public class Template extends BaseTimeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Boolean isPublic;
    private String pdfFilePath;
    private String pdfImagePath;
    private String pdfImageUrl;
    private UUID userid;
}

