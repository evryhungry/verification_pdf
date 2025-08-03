package org.capsc.pdf.document.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "documents_role")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "assigned_user_id", columnDefinition = "uuid", nullable = false)
    private UUID assignedUserId;
    @Enumerated(EnumType.STRING)
    @Column(name = "task_role", nullable = false)
    private TaskRole taskRole;

    public enum TaskRole {
        CREATOR,
        EDITOR,
        REVIEWER
    }
}