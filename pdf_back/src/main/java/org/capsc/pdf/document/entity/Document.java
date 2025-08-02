package org.capsc.pdf.document.entity;

import jakarta.persistence.*;
import lombok.*;
import org.capsc.pdf.common.entity.BaseTimeEntity;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "documents")
public class Document extends BaseTimeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long templateId;

    @Column(columnDefinition = "jsonb")
    private String data;

    @Enumerated(EnumType.STRING)
    private DocumentStatus status;
    private LocalDateTime deadline;

    public enum DocumentStatus {
        EDITING, REVIEWING, COMPLETED, REJECTED
    }
}

